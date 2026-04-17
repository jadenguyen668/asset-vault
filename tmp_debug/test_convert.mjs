/**
 * Debug script: Test Spine CLI conversion manually
 * Run: node tmp_debug/test_convert.mjs
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);
const SPINE_CLI = 'C:/Program Files/Spine/Spine.com';

const tmpDir = 'd:/Dev/live_asset/tmp_debug';
const inputJsonPath = path.join(tmpDir, 'input.json');
const exportJsonPath = path.join(tmpDir, 'export.json');
const projectPath = path.join(tmpDir, 'project.spine');
const outputDir = path.join(tmpDir, 'output');

async function main() {
    // Check if input.json exists (you need to manually place a spine json file here)
    try {
        await fs.access(inputJsonPath);
    } catch {
        console.log('❌ Please place a Spine JSON file at:', inputJsonPath);
        console.log('   You can copy any character .json from the browser download.');
        return;
    }

    const jsonText = await fs.readFile(inputJsonPath, 'utf-8');
    const parsed = JSON.parse(jsonText);
    const origVersion = parsed?.skeleton?.spine || 'unknown';
    console.log('📄 Original version:', origVersion);

    const vParts = origVersion.split('.');
    const originalVersionArg = `${vParts[0]}.${vParts[1]}.xx`;
    const targetVersion = '3.8';

    await fs.mkdir(outputDir, { recursive: true });

    // Write export.json WITH version field
    const exportSettings = {
        class: "export-json",
        extension: ".json",
        format: "JSON",
        nonessential: true,
        prettyPrint: true,
        cleanUp: true,
        warnings: true,
        version: targetVersion
    };
    await fs.writeFile(exportJsonPath, JSON.stringify(exportSettings, null, 2), 'utf-8');
    console.log('📝 Export settings:', JSON.stringify(exportSettings, null, 2));

    // Step 1: Import
    console.log(`\n🔄 Step 1: Importing with Spine ${originalVersionArg}...`);
    try {
        const result1 = await execFileAsync(SPINE_CLI, [
            '-u', originalVersionArg,
            '-i', inputJsonPath,
            '-o', projectPath,
            '-r'
        ]);
        console.log('   stdout:', result1.stdout);
        console.log('   stderr:', result1.stderr);
    } catch (e) {
        console.log('   ❌ Import failed:', e.message);
        console.log('   stdout:', e.stdout);
        console.log('   stderr:', e.stderr);
        return;
    }

    // Check project file
    const projStat = await fs.stat(projectPath);
    console.log('   ✅ Project file created:', projStat.size, 'bytes');

    // Step 2: Export with version field
    console.log(`\n🔄 Step 2: Exporting with Spine ${originalVersionArg} -> version field ${targetVersion}...`);
    try {
        const result2 = await execFileAsync(SPINE_CLI, [
            '-u', originalVersionArg,
            '-i', projectPath,
            '-o', outputDir,
            '-e', exportJsonPath
        ]);
        console.log('   stdout:', result2.stdout);
        console.log('   stderr:', result2.stderr);
    } catch (e) {
        console.log('   ❌ Export failed:', e.message);
        console.log('   stdout:', e.stdout);
        console.log('   stderr:', e.stderr);
        return;
    }

    // Check output
    const files = await fs.readdir(outputDir);
    console.log('\n📁 Output files:', files);
    
    for (const f of files) {
        const fPath = path.join(outputDir, f);
        const stat = await fs.stat(fPath);
        console.log(`   ${f}: ${stat.size} bytes`);
        
        if (f.endsWith('.json')) {
            const content = await fs.readFile(fPath, 'utf-8');
            const p = JSON.parse(content);
            console.log(`   Version in output: ${p?.skeleton?.spine}`);
            console.log(`   Bones count: ${p?.bones?.length || 0}`);
            console.log(`   Slots count: ${p?.slots?.length || 0}`);
            console.log(`   Animations: ${Object.keys(p?.animations || {}).length}`);
            console.log(`   First 200 chars:\n   ${content.substring(0, 200)}`);
        }
    }
}

main().catch(console.error);
