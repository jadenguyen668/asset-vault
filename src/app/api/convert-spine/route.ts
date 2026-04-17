import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import os from 'os';

const execFileAsync = promisify(execFile);

const DEFAULT_EXPORT_JSON = {
    class: "export-json",
    extension: ".json",
    format: "JSON",
    nonessential: true,
    prettyPrint: true,
    cleanUp: false,
    warnings: true
};

export async function POST(req: Request) {
    try {
        const { jsonText, targetVersion } = await req.json();

        if (!jsonText || !targetVersion) {
            return NextResponse.json({ error: 'Missing jsonText or targetVersion' }, { status: 400 });
        }

        let spineCliPath = process.env.SPINE_CLI_PATH;
        if (!spineCliPath) {
            return NextResponse.json({ error: 'SPINE_CLI_PATH environment variable is not configured.' }, { status: 500 });
        }
        
        // Ensure we use Spine.com on Windows (Spine.exe opens the GUI)
        if (os.platform() === 'win32' && !spineCliPath.toLowerCase().endsWith('.com') && !spineCliPath.toLowerCase().endsWith('.exe')) {
            spineCliPath += '.com';
        }

        // Spine requires version format like 4.2.xx instead of just 4.2
        const formattedVersion = targetVersion.split('.').length === 2 ? `${targetVersion}.xx` : targetVersion;

        // Create a unique temporary workspace
        const tempId = crypto.randomUUID();
        const tmpDir = path.join(os.tmpdir(), `spine_convert_${tempId}`);
        await fs.mkdir(tmpDir, { recursive: true });

        const inputJsonPath = path.join(tmpDir, 'input.json');
        const exportJsonPath = path.join(tmpDir, 'export.json');
        const projectPath = path.join(tmpDir, 'project.spine');
        const outputDirPath = path.join(tmpDir, 'output');
        await fs.mkdir(outputDirPath, { recursive: true });

        try {
            await fs.writeFile(inputJsonPath, jsonText, 'utf-8');
            
            let originalVersionStr = '4.1.xx';
            try {
                const parsedData = JSON.parse(jsonText);
                if (parsedData?.skeleton?.spine) {
                    originalVersionStr = parsedData.skeleton.spine;
                }
            } catch(e) {}
            
            // Clean version string: "3.8-from-4.0-from-4.1-from-4.2.43" → take "3.8" (first segment before "-from-")
            const cleanOriginalVersion = originalVersionStr.split('-from-')[0].split('-')[0];
            const vParts = cleanOriginalVersion.split('.');
            const originalVersionArg = vParts.length >= 2 ? `${vParts[0]}.${vParts[1]}.xx` : cleanOriginalVersion;

            // Version comparison: extract major.minor as numbers
            const originalMajor = parseInt(vParts[0]) || 0;
            const originalMinor = parseInt(vParts[1]) || 0;
            const targetParts = targetVersion.split('.');
            const targetMajor = parseInt(targetParts[0]) || 0;
            const targetMinor = parseInt(targetParts[1]) || 0;

            // Check if same version → just return original
            if (originalMajor === targetMajor && originalMinor === targetMinor) {
                return NextResponse.json({
                    success: true,
                    newVersion: originalVersionStr,
                    jsonText: jsonText
                });
            }

            // Determine which Spine version to use
            const isUpgrade = targetMajor > originalMajor || (targetMajor === originalMajor && targetMinor > originalMinor);

            // Build export.json with target version field
            const exportSettings = {
                ...DEFAULT_EXPORT_JSON,
                version: `${targetMajor}.${targetMinor}`,
                cleanUp: true
            };
            await fs.writeFile(exportJsonPath, JSON.stringify(exportSettings), 'utf-8');

            console.log(`[SPINE CONVERT] Starting conversion ${originalVersionArg} -> ${formattedVersion} (${isUpgrade ? 'UPGRADE' : 'DOWNGRADE'}) via Spine CLI...`);
            console.log(`[SPINE CONVERT] Export settings:`, JSON.stringify(exportSettings));

            if (isUpgrade) {
                // UPGRADE: Import with original version to create project, then export with target version
                console.log(`[SPINE CONVERT] Upgrade path: import(${originalVersionArg}) -> export(${formattedVersion})`);
                
                await execFileAsync(spineCliPath, [
                    '-u', originalVersionArg,
                    '-i', inputJsonPath,
                    '-o', projectPath,
                    '-r'
                ]);

                await execFileAsync(spineCliPath, [
                    '-u', formattedVersion,
                    '-i', projectPath,
                    '-o', outputDirPath,
                    '-e', exportJsonPath
                ]);
            } else {
                // DOWNGRADE: Use the ORIGINAL (higher) Spine version to directly re-export 
                // the data file in the older format — this is how the GUI does it
                console.log(`[SPINE CONVERT] Downgrade path: direct export(${originalVersionArg}) with version field=${targetMajor}.${targetMinor}`);
                
                await execFileAsync(spineCliPath, [
                    '-u', originalVersionArg,
                    '-i', inputJsonPath,
                    '-o', outputDirPath,
                    '-e', exportJsonPath
                ]);
            }

            // Read the newly generated JSON file
            const files = await fs.readdir(outputDirPath);
            console.log(`[SPINE CONVERT] Output directory files:`, files);
            
            const generatedJsonFile = files.find(f => f.endsWith('.json'));

            if (!generatedJsonFile) {
                throw new Error('Spine CLI did not produce an output JSON file.');
            }


            const newJsonPathActual = path.join(outputDirPath, generatedJsonFile);
            let convertedJsonText = await fs.readFile(newJsonPathActual, 'utf-8');
            let testParse = JSON.parse(convertedJsonText);

            // Minimal cleanup: remove project-specific paths that shouldn't be in exported data
            if (testParse.skeleton) {
                delete testParse.skeleton.images;
                delete testParse.skeleton.audio;
                convertedJsonText = JSON.stringify(testParse);
            }

            // Debug: save a copy for inspection
            const debugCopyPath = path.join('d:/Dev/live_asset/tmp_debug', `output_${targetMajor}.${targetMinor}.json`);
            try { await fs.writeFile(debugCopyPath, convertedJsonText, 'utf-8'); } catch(e) {}

            // Detailed logging
            console.log(`[SPINE CONVERT] Output file: ${generatedJsonFile}, size: ${convertedJsonText.length} bytes`);
            console.log(`[SPINE CONVERT] Version: ${testParse?.skeleton?.spine}`);
            console.log(`[SPINE CONVERT] Bones: ${testParse?.bones?.length || 0}`);
            console.log(`[SPINE CONVERT] Slots: ${testParse?.slots?.length || 0}`);
            console.log(`[SPINE CONVERT] Skins: ${Array.isArray(testParse.skins) ? testParse.skins.length : Object.keys(testParse?.skins || {}).length}`);
            console.log(`[SPINE CONVERT] Animations: ${Object.keys(testParse?.animations || {}).length}`);
            
            if (!testParse.skeleton || !testParse.skeleton.spine) {
                throw new Error('Converted JSON seems invalid.');
            }

            console.log(`[SPINE CONVERT] Successfully converted to ${testParse.skeleton.spine}`);

            const isMajorDowngrade = !isUpgrade && originalMajor !== targetMajor;
            return NextResponse.json({
                success: true,
                newVersion: testParse.skeleton.spine,
                jsonText: convertedJsonText,
                warning: isMajorDowngrade 
                    ? `⚠️ Hạ cấp từ Spine ${originalMajor}.x xuống ${targetMajor}.x có thể gây mất dữ liệu (constraints, physics, v.v.). Một số tính năng mới của phiên bản cao sẽ bị loại bỏ.` 
                    : undefined
            });

        } finally {
            // Clean up temp directory
            try {
                await fs.rm(tmpDir, { recursive: true, force: true });
            } catch (err) {
                console.error(`[SPINE CONVERT] Cleanup failed for ${tmpDir}:`, err);
            }
        }

    } catch (e: any) {
        console.error('[SPINE CONVERT ERROR]', e);
        return NextResponse.json({ 
            error: e.message || 'Failed to convert spine version',
            details: e.stdout || e.stderr || '' 
        }, { status: 500 });
    }
}
