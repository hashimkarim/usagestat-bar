import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import System from 'system';
import GdkPixbuf from 'gi://GdkPixbuf';
import {fetchProviderUsage, normalizeBackendSnapshot} from '../../cli.js';
import {assert, equal} from '../assert.js';
import {settings, ROOT} from '../../platforms/linux/settings.js';
import {Model, selectedUsage, panelProviders, thresholds, thresholdAt, windows, resetText, safeUrl} from '../../platforms/linux/model.js';
import {escapeXml, escapePolybar, panelSvg, verticalPanelSvg, panelText, waybarOutput, logoSvg, traySvg, svgPixels, renderFiles} from '../../platforms/linux/render.js';
import {resolveProviderIcon, providerIcons} from '../../providerMetadata.js';
import {providerGlyph} from '../../platforms/polybar/icons.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const prefs = settings();
const usage = {primary:{usedPercent:25}, secondary:{usedPercent:80}};
test('shared icons resolve colour and product alternatives without changing provider identity', () => {
    equal(Object.keys(providerIcons).length, 155);
    equal(resolveProviderIcon('codex', {variant:'chatgpt'}).file, 'openai.svg');
    equal(resolveProviderIcon('claude', {variant:'claude-code',style:'color'}).file, 'claudecode-color.svg');
    equal(resolveProviderIcon('openai', {style:'color'}).style, 'monochrome');
    equal(resolveProviderIcon('codex', {variant:'claude'}), undefined);
    equal(resolveProviderIcon('__proto__'), undefined);
    assert(logoSvg({iconId:'claudecode',iconStyle:'color'}, {neutral:'#ffffff'}).includes('#D97757'));
});
test('Linux snapshots validate saved product marks while preserving provider identity and usage', () => {
    const model = new Model(prefs);
    const saved = prefs.get_string('provider-usage-settings');
    try {
        model.usage.set('codex:fixture-work', {usage});
        const before = model.snapshot().providers;
        for (const [codex, claude, expectedCodex, expectedClaude] of [
            ['chatgpt', 'claude-code', 'openai', 'claudecode'],
            ['openai-api', 'anthropic', 'openai', 'anthropic'],
            ['claude', 'codex', 'codex', 'claude'],
            ['missing-product', '__proto__', 'codex', 'claude'],
            ['', '', 'codex', 'claude'],
        ]) {
            prefs.set_string('provider-usage-settings', JSON.stringify({
                'codex:fixture-work': {iconSource: codex, iconStyle: 'color'},
                claude: {iconSource: claude},
            }));
            const after = model.snapshot().providers;
            equal(after.find(provider => provider.key === 'codex:fixture-work').iconId, expectedCodex);
            equal(after.find(provider => provider.key === 'claude').iconId, expectedClaude);
            equal(after.find(provider => provider.key === 'codex').iconId, 'codex');
            const identityAndUsage = ({key, id, parent, source, used}) => ({key, id, parent, source, used});
            equal(after.map(identityAndUsage), before.map(identityAndUsage));
        }
    } finally {
        model.close();
        prefs.set_string('provider-usage-settings', saved);
    }
});
test('the default panel uses the session meter', () => equal(selectedUsage(usage),25));
test('an explicit automatic panel usage averages standard windows', () => equal(selectedUsage(usage,{panelUsageTier:'auto'}),52.5));
test('a selected window overrides the automatic mean', () => equal(selectedUsage(usage,{panelUsageTier:'secondary'}),80));
test('hidden selection falls back to the visible average', () => equal(selectedUsage(usage,{panelUsageTier:'secondary',hiddenWindows:['secondary']}),25));
test('automatic excludes extra windows while explicit selection supports them', () => {
    const data = {...usage,extraRateWindows:[{id:'extra',title:'Extra',window:{usedPercent:100}}]};
    equal(selectedUsage(data,{panelUsageTier:'auto'}),52.5); equal(selectedUsage(data,{panelUsageTier:'extra'}),100);
});
test('automatic exhausted primary falls back to paid quota', () => equal(selectedUsage({primary:{usedPercent:100},providerCost:{used:20,limit:80}},{panelUsageTier:'auto'}),25));
test('session selection keeps exhausted session visible', () => equal(selectedUsage({primary:{usedPercent:100},providerCost:{used:20,limit:80}}),100));
test('hidden paid quota does not override standard usage', () => equal(selectedUsage({primary:{usedPercent:100},providerCost:{used:20,limit:80}},{hiddenWindows:['extraUsage']}),100));
test('no quota is unavailable rather than reported as unused', () => equal(selectedUsage({}),null));
test('TypeSafe billing and blocked snapshots reach the Linux view without fabricated percentages', async () => {
    const model = new Model(prefs);
    const scenario = GLib.getenv('USAGESTAT_FIXTURE_SCENARIO');
    try {
        model.providers = [{id: 'typesafe', enabled: true, source: 'web'}];
        for (const name of ['typesafe-billing', 'typesafe-blocked']) {
            GLib.setenv('USAGESTAT_FIXTURE_SCENARIO', name, true);
            model.usage.set('typesafe', await fetchProviderUsage(model.providers[0], null, {cliPath: `${ROOT}/tests/fixtures/usagestat`}));
            const view = model.snapshot().providers[0];
            equal(view.percent, null);
            equal(view.windows, []);
            if (name === 'typesafe-billing') {
                equal(view.error, '');
                equal(view.lines.find(line => line.label === 'Balance').value, 'USD 4.98');
            } else {
                assert(view.error.includes('Cloudflare'));
                equal(view.statusColor, '#ff5f57');
                equal(view.text, 'Error');
            }
        }
    } finally {
        model.close();
        if (scenario === null) GLib.unsetenv('USAGESTAT_FIXTURE_SCENARIO');
        else GLib.setenv('USAGESTAT_FIXTURE_SCENARIO', scenario, true);
    }
});
test('clamp each standard window before averaging', () => equal(selectedUsage({primary:{usedPercent:125},secondary:{usedPercent:-10}},{panelUsageTier:'auto'}),50));
test('all extra window units and reset metadata survive', () => {
    const data={extraRateWindows:[{id:'api',title:'API',window:{usedPercent:22,used:22,limit:100,format:{kind:'count'},resetsAt:'2099-01-01'}}]};
    equal(windows(data)[0],{id:'api',label:'API',...data.extraRateWindows[0].window});
});
test('pinned provider order is stable and child sources never occupy panel slots', () => {
    const providers=[{key:'a',parent:''},{key:'b',parent:''},{key:'child',parent:'a'},{key:'c',parent:''}];
    equal(panelProviders(providers,'b',['c'],2).map(p=>p.key),['c','b']);
});
test('highest threshold wins', () => equal(thresholdAt(95,thresholds(prefs)).id,'danger'));
test('threshold order is numeric and invalid colors cannot enter SVG', () => {
    prefs.set_string('usage-thresholds',JSON.stringify([{percent:90,id:'high',color:'"/><script>'},{percent:75,id:'low'}]));
    equal(thresholds(prefs).map(t=>t.id),['low','high']); equal(thresholds(prefs)[1].color,'#f6d32d');
    prefs.reset('usage-thresholds');
});
test('window reset description takes precedence', () => equal(resetText({resetDescription:'Daily',resetsAt:'2099-01-01'}),'Daily'));
test('invalid reset timestamps do not render Invalid Date', () => equal(resetText({resetsAt:'garbage'}),''));
test('relative reset uses the supplied clock', () => equal(resetText({resetsAt:'2026-01-15T13:30:00Z'},'relative',new Date('2026-01-15T12:00:00Z')),'Resets 1h 30m'));
test('non-web provider links are not executable', () => { equal(safeUrl('file:///etc/passwd'),''); equal(safeUrl('https://example.test'),'https://example.test'); });
test('XML text cannot introduce elements', () => equal(escapeXml('<b a="x">&'), '&lt;b a=&quot;x&quot;&gt;&amp;'));
test('Polybar provider text cannot inject click actions', () => { assert(!escapePolybar('%{A:danger:}x\ny').includes('%{')); assert(!escapePolybar('x\ny').includes('\n')); });
test('Polybar uses provider logo glyphs, including aliases and renamed accounts', () => {
    const glyph = providerGlyph({iconId:'claude'});
    assert(glyph.codePointAt(0) >= 0x100000);
    equal(providerGlyph({iconId:'opencode'}), providerGlyph({iconId:'opencode-go'}));
    for (const iconId of ['%{A:bad:}', 'constructor', '__proto__', 'toString', undefined])
        equal(providerGlyph({iconId}), String.fromCodePoint(0x100000));
    const provider = {key:'work',name:'My renamed account',iconId:'claude',percent:50};
    equal(panelText({providers:[provider],panel:['work'],appearance:{components:['logo']}},true), glyph);
    assert(glyph !== providerGlyph({iconId:'codex'}));
});
test('SVG provider labels and color settings cannot introduce markup', () => {
    const provider = {key:'a',name:'<script>&',percent:0,used:0,color:'#8ab4f8',windows:[],iconId:'codex'};
    const state={providers:[provider],panel:['a'],appearance:{components:['bar','text'],bars:1,layout:'vertical',spacing:4,neutral:'#e6edf3'}};
    const svg=panelSvg(state); assert(svg.includes('&lt;script&gt;&amp;')); assert(!svg.includes('<script>'));
});
test('Waybar emits JSON with escaped text and used-quota threshold classes', () => {
    const p={key:'a',name:'A & B',percent:5,used:95,text:'5% left',parent:'',error:'',threshold:{id:'danger'}};
    const result=waybarOutput({providers:[p],panel:['a'],active:'a',appearance:{components:['text','percent']}});
    equal(result.class,['threshold','danger']); assert(result.text.includes('A &amp; B'));
});
test('logo SVG preserves root fill and has intrinsic pixel dimensions', () => {
    const svg=logoSvg({iconId:'codex',percent:25},{neutral:'#23262e',fill:'vertical'});
    assert(svg.includes('fill="#23262e"')); assert(svg.includes('quotaClip')); assert(svg.includes('<path'));
});
test('metric normalization preserves paid usage, credits, code review and service status', () => {
    const raw = {metrics:[{type:'progress',used:50,limit:100}],providerCost:{used:10,limit:40,currencyCode:'EUR'},
        credits:{remaining:17},openaiDashboard:{codeReviewRemainingPercent:63},status:{indicator:'minor'}};
    const result = normalizeBackendSnapshot(raw,'codex');
    equal(result.usage.providerCost,raw.providerCost); equal(result.credits,raw.credits);
    equal(result.openaiDashboard,raw.openaiDashboard); equal(result.status,raw.status);
});
test('custom raster icons load and every fill mode rasterizes in the combined SVG', () => {
    const path = `${GLib.get_tmp_dir()}/usagestat-icon-${GLib.uuid_string_random()}.png`;
    const pixels = GdkPixbuf.Pixbuf.new(GdkPixbuf.Colorspace.RGB,true,8,20,10);
    pixels.fill(0xff6600ff); pixels.savev(path,'png',[],[]);
    try {
        for (const fill of ['full','horizontal','vertical','pie']) {
            const provider = {key:'a',iconPath:path,iconId:'codex',percent:25};
            const appearance = {components:['logo'],neutral:'#23262e',fill,spacing:4};
            assert(logoSvg(provider,appearance).includes('data:image/png;base64,'));
            const loader = GdkPixbuf.PixbufLoader.new_with_type('svg');
            loader.write(new TextEncoder().encode(panelSvg({providers:[provider],panel:['a'],appearance}))); loader.close();
            const rendered = loader.get_pixbuf();
            assert(rendered.get_width() > 20 && rendered.get_pixels().some(value => value > 0));
        }
    } finally { Gio.File.new_for_path(path).delete(null); }
});
test('a malformed custom SVG cannot stop panel, tray or provider rendering', () => {
    const path = `${GLib.get_tmp_dir()}/usagestat-broken-icon-${GLib.uuid_string_random()}.svg`;
    GLib.file_set_contents(path, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M1 1h20v20H1z"/></svg>');
    const provider = {key:'custom',name:'Custom',iconId:'custom',iconPath:path,percent:25,color:'#123456'};
    const appearance = {components:['logo'],neutral:'#23262e',fill:'full',spacing:4};
    try {
        for (const fill of ['full','horizontal','vertical','pie']) {
            const state = renderFiles({providers:[{...provider}],panel:['custom'],appearance:{...appearance,fill}});
            for (const file of [state.panelImagePng, state.panelImageVerticalPng, state.providers[0].logo]) {
                const pixels = GdkPixbuf.Pixbuf.new_from_file(file);
                assert(pixels.get_pixels().some(value => value > 0), 'Fallback icon must stay visible');
            }
            svgPixels(traySvg(provider, {...appearance,style:'logo-fill',fill}),32);
        }
    } finally { Gio.File.new_for_path(path).delete(null); }
});
test('custom SVGs with intrinsic dimensions render without a viewBox', () => {
    const path = `${GLib.get_tmp_dir()}/usagestat-sized-icon-${GLib.uuid_string_random()}.svg`;
    GLib.file_set_contents(path, '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="currentColor"/></svg>');
    const provider = {key:'custom',iconId:'custom',iconPath:path,percent:25};
    try {
        for (const neutral of ['#ff0000','#00ff00']) {
            const state = {providers:[provider],panel:['custom'],appearance:{components:['logo'],neutral,fill:'full',spacing:4}};
            for (const svg of [panelSvg(state), verticalPanelSvg(state), traySvg(provider,{neutral,style:'logo'})]) {
                const pixels = svgPixels(svg,64);
                const data = pixels.get_pixels(), channels = pixels.get_n_channels();
                const colorChannel = neutral === '#ff0000' ? 0 : 1;
                assert(data.some((value,index) => index % channels === colorChannel && value > 200), 'Custom logo and theme color must be visible');
            }
        }
    } finally { Gio.File.new_for_path(path).delete(null); }
});
test('text bars retain multiple windows and custom threshold colors without action injection', () => {
    const p = {key:'a',name:'A %{A:bad:}',percent:95,used:5,text:'95% left',color:'#123456',threshold:{id:'custom',percent:4},
        windows:[{percent:95,color:'#123456'},{percent:20,color:'#abcdef'}]};
    const state = {providers:[p],panel:['a'],active:'a',appearance:{components:['bar','logo','text'],bars:2}};
    const result = waybarOutput(state);
    equal(result.class,['threshold','custom']); assert(result.text.includes('#abcdef'));
    const polybar = panelText(state,true);
    assert(polybar.includes('%{F#123456}') && polybar.includes('%{F#abcdef}'));
    assert(!polybar.includes('%{A:bad:}'));
    assert(polybar.includes('━'), 'Quota meters should remain visible text');
});
test('tray appearance selects logo fills, meters and percentage labels', () => {
    const provider={name:'Codex',iconId:'codex',percent:30,color:'#123456',windows:[{percent:20,color:'#123456'},{percent:80,color:'#abcdef'}]};
    const logo=traySvg(provider,{style:'logo-fill',neutral:'#ffffff',fill:'pie'});
    assert(logo.includes('quotaClip') && !logo.includes('stroke-dasharray'));
    for (const barOrientation of ['horizontal','vertical']) {
        const meter=traySvg(provider,{style:'logo-meter',accent:'#abcdef',background:'#ffffff',barOrientation,barThickness:7});
        assert(meter.includes('#abcdef') && !meter.includes('stroke-dasharray'));
    }
    const numeric=traySvg({...provider,percent:100},{style:'percentage'});
    assert(numeric.includes('>100<') && numeric.includes('>%</tspan>'));
    assert(!traySvg({...provider,percent:null},{style:'percentage'}).includes('>%</tspan>'));
});

const loop=new GLib.MainLoop(null,false);
let failure=0;
(async()=>{
    const fixture=`${ROOT}/tests/fixtures/usagestat`;
    prefs.set_string('usagestat-cli-path',fixture);
    prefs.set_int('refresh-interval',0);
    for(const [i,[name,fn]] of tests.entries()){
        try {await fn(); print(`ok ${i+1} - ${name}`);}
        catch(error){failure++;printerr(`not ok - ${name}: ${error.message}`);}
    }
    let model;
    try {
        const notifications=[];
        model=new Model(prefs,()=>{},(title,body)=>notifications.push({title,body}));
        await model.refresh();
        equal(model.snapshot().providers.length,3);
        equal(model.snapshot().providers[0].used,25);
        prefs.set_string('usage-thresholds',JSON.stringify([{id:'warning',label:'Warning',percent:75,color:'#f6d32d',notify:true}]));
        model.checkThreshold(model.providers[0],{usage:{primary:{usedPercent:80}}});
        equal(notifications.length,1);
        model.checkThreshold(model.providers[0],{usage:{primary:{usedPercent:80}}});
        model.checkThreshold(model.providers[0],{usage:{primary:{usedPercent:20}}});
        equal(notifications.length,1);
        model.checkThreshold(model.providers[0],{usage:{primary:{usedPercent:90}}});
        equal(notifications.length,2);
        print(`ok ${tests.length+1} - real fixture refresh, notifications suppress first/repeated/downward observations`);
    } catch(error){failure++;printerr(`not ok - model integration: ${error.message}\n${error.stack}`);}
    finally{model?.close();}
    print(`1..${tests.length+1}`);
})().finally(()=>loop.quit());
loop.run();
System.exit(failure?1:0);
