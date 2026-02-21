// src/utils/watermark.js
export const addWatermark = (code, startTime) => {
    const endTime = Date.now();
    const timeTaken = endTime - startTime;
    
    const watermark = `/**\n` +
                      ` * Time To Process: ${timeTaken}ms\n` +
                      ` * Deobfuscated by Vex\n` +
                      ` * Discord: discord.gg/vex\n` +
                      ` **/\n`;
                      
    return watermark + code;
};