/**
 * Converts a Spine 4.x atlas text to Spine 3.x atlas format.
 * 
 * 4.x format:
 *   page.png
 *   size: 1024,1024
 *   filter: Linear,Linear
 *   pma: true
 *   RegionName
 *     bounds: x,y,w,h
 *     offsets: stripL,stripB,origW,origH
 *     rotate: false|true|degrees
 * 
 * 3.x format:
 *   page.png
 *   size: 1024,1024
 *   format: RGBA8888
 *   filter: Linear,Linear
 *   repeat: none
 *   RegionName
 *     rotate: false
 *     xy: x, y
 *     size: w, h
 *     orig: origW, origH
 *     offset: stripL, stripB
 *     index: -1
 */
export function convertAtlas4xTo3x(atlasText: string): string {
    if (!atlasText || atlasText.trim().length === 0) return atlasText;

    // Quick check: if atlas already has "format:" or "xy:", it's likely already 3.x
    if (atlasText.includes('format:') || atlasText.includes('\nxy:') || atlasText.includes('\n  xy:')) {
        return atlasText;
    }
    // Quick check: if atlas doesn't have "bounds:", it's not 4.x either
    if (!atlasText.includes('bounds:')) {
        return atlasText;
    }

    const lines = atlasText.split(/\r?\n/);
    const output: string[] = [];

    let inPage = false;
    let pageHeaderDone = false;
    let hasFormat = false;

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Blank line = end of page section, reset
        if (trimmed.length === 0) {
            output.push('');
            inPage = false;
            pageHeaderDone = false;
            hasFormat = false;
            i++;
            continue;
        }

        // Check if this is a page header (first non-empty line after blank or start)
        if (!inPage && !pageHeaderDone) {
            // This is the page image filename
            output.push(trimmed);
            inPage = true;
            i++;
            continue;
        }

        // Page header properties
        if (inPage && !pageHeaderDone) {
            if (trimmed.startsWith('size:')) {
                output.push('  ' + trimmed);
                i++;
                // Check if next line is format or filter
                const nextTrimmed = (i < lines.length) ? lines[i].trim() : '';
                if (!nextTrimmed.startsWith('format:')) {
                    // 4.x doesn't have format, add it
                    output.push('  format: RGBA8888');
                    hasFormat = true;
                }
                continue;
            } else if (trimmed.startsWith('format:')) {
                output.push('  ' + trimmed);
                hasFormat = true;
                i++;
                continue;
            } else if (trimmed.startsWith('filter:')) {
                if (!hasFormat) {
                    output.push('  format: RGBA8888');
                    hasFormat = true;
                }
                output.push('  ' + trimmed);
                i++;
                // Check if next line is repeat or pma
                const nextTrimmed = (i < lines.length) ? lines[i].trim() : '';
                if (nextTrimmed.startsWith('pma:')) {
                    // Skip pma, add repeat instead
                    output.push('  repeat: none');
                    i++; // skip pma line
                } else if (nextTrimmed.startsWith('repeat:')) {
                    // Already has repeat, keep it
                    output.push('  ' + nextTrimmed);
                    i++;
                } else {
                    // No repeat or pma, add default
                    output.push('  repeat: none');
                }
                pageHeaderDone = true;
                continue;
            } else if (trimmed.startsWith('pma:')) {
                // Replace pma with repeat
                output.push('  repeat: none');
                pageHeaderDone = true;
                i++;
                continue;
            } else if (trimmed.startsWith('repeat:')) {
                output.push('  ' + trimmed);
                pageHeaderDone = true;
                i++;
                continue;
            } else {
                // This must be a region name - page header is done
                pageHeaderDone = true;
                // Don't increment i, fall through to region handling
            }
        }

        // Region handling
        if (pageHeaderDone) {
            const colonIdx = trimmed.indexOf(':');
            
            if (colonIdx === -1) {
                // No colon = this is a region name
                output.push(trimmed);
                i++;
                
                // Read region properties and convert
                let bounds = '';
                let offsets = '';
                let rotate = 'false';
                let index = '-1';
                
                while (i < lines.length) {
                    const rl = lines[i].trim();
                    if (rl.length === 0 || rl.indexOf(':') === -1) break;
                    
                    if (rl.startsWith('bounds:')) {
                        bounds = rl.substring(7).trim();
                        i++;
                    } else if (rl.startsWith('offsets:')) {
                        offsets = rl.substring(8).trim();
                        i++;
                    } else if (rl.startsWith('rotate:')) {
                        rotate = rl.substring(7).trim();
                        i++;
                    } else if (rl.startsWith('index:')) {
                        index = rl.substring(6).trim();
                        i++;
                    } else if (rl.startsWith('split:') || rl.startsWith('pad:')) {
                        // Pass through ninepatch data
                        output.push('  ' + rl);
                        i++;
                    } else {
                        // Unknown property - pass through
                        output.push('  ' + rl);
                        i++;
                    }
                }
                
                // Convert rotate value
                if (rotate === 'true') rotate = 'true';
                else if (rotate === 'false' || rotate === '0') rotate = 'false';
                else rotate = rotate; // degrees

                // Parse bounds: x, y, w, h
                const bParts = bounds.split(',').map(s => s.trim());
                const bx = bParts[0] || '0';
                const by = bParts[1] || '0';
                const bw = bParts[2] || '0';
                const bh = bParts[3] || '0';

                // Parse offsets: stripL, stripB, origW, origH
                let origW = bw, origH = bh, offX = '0', offY = '0';
                if (offsets) {
                    const oParts = offsets.split(',').map(s => s.trim());
                    offX = oParts[0] || '0';
                    offY = oParts[1] || '0';
                    origW = oParts[2] || bw;
                    origH = oParts[3] || bh;
                }

                // Write 3.x format
                output.push(`  rotate: ${rotate}`);
                output.push(`  xy: ${bx}, ${by}`);
                output.push(`  size: ${bw}, ${bh}`);
                output.push(`  orig: ${origW}, ${origH}`);
                output.push(`  offset: ${offX}, ${offY}`);
                output.push(`  index: ${index}`);
                
                continue;
            } else {
                // Has colon but we're in region area - might be an orphan property
                output.push('  ' + trimmed);
                i++;
                continue;
            }
        }

        // Fallback
        output.push(line);
        i++;
    }

    return output.join('\n');
}
