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
            await fs.writeFile(exportJsonPath, JSON.stringify(DEFAULT_EXPORT_JSON), 'utf-8');
            
            let originalVersionStr = '4.1.xx';
            try {
                const parsedData = JSON.parse(jsonText);
                if (parsedData?.skeleton?.spine) {
                    originalVersionStr = parsedData.skeleton.spine;
                }
            } catch(e) {}
            
            const vParts = originalVersionStr.split('.');
            const originalVersionArg = vParts.length >= 2 ? `${vParts[0]}.${vParts[1]}.xx` : originalVersionStr;

            console.log(`[SPINE CONVERT] Starting conversion ${originalVersionArg} -> ${formattedVersion} via Spine CLI...`);

            // Step 1: Import JSON data and create a .spine project file using the ORIGINAL version
            // Command: Spine -u <originalVersion> -i <input.json> -o <project.spine> -r
            await execFileAsync(spineCliPath, [
                '-u', originalVersionArg,
                '-i', inputJsonPath,
                '-o', projectPath,
                '-r'
            ]);

            // Step 2: Export the newly created project file to the desired version JSON
            // Command: Spine -u <version> -i <project.spine> -o <output_dir> -e <export.json>
            await execFileAsync(spineCliPath, [
                '-u', formattedVersion,
                '-i', projectPath,
                '-o', outputDirPath,
                '-e', exportJsonPath
            ]);

            // Read the newly generated JSON file
            const newJsonPath = path.join(outputDirPath, 'project.json'); 
            // Note: By default, Spine might name the output based on the project name. 
            // Since the project is 'project.spine', the output might be 'project.json'.
            
            // Let's actually scan the output directory for any .json file just in case the name differs.
            const files = await fs.readdir(outputDirPath);
            const generatedJsonFile = files.find(f => f.endsWith('.json'));

            if (!generatedJsonFile) {
                throw new Error('Spine CLI did not produce an output JSON file.');
            }

            const newJsonPathActual = path.join(outputDirPath, generatedJsonFile);
            const convertedJsonText = await fs.readFile(newJsonPathActual, 'utf-8');

            // Optionally parse and verify
            const testParse = JSON.parse(convertedJsonText);
            if (!testParse.skeleton || !testParse.skeleton.spine) {
                throw new Error('Converted JSON seems invalid.');
            }

            console.log(`[SPINE CONVERT] Successfully converted to ${testParse.skeleton.spine}`);

            return NextResponse.json({
                success: true,
                newVersion: testParse.skeleton.spine,
                jsonText: convertedJsonText
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
