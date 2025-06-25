const genAI = require('../config/gemini');

const checkTextForAbuse = async (text) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Check the following text for any sexual abuse, hate speech, or inappropriate content. Respond with 'SAFE' if no such content is found, otherwise respond with 'UNSAFE'.\n\nText: "${text}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const content = response.text();
        return content.trim().toUpperCase() === 'UNSAFE';
    } catch (error) {
        console.error('Error checking text for abuse with Gemini API:', error);
        return false; // Default to safe if API call fails
    }
};

const axios = require('axios');

const checkImageForAbuse = async (imageUrl) => {
    if (!imageUrl) {
        console.warn('Empty image URL provided to checkImageForAbuse.');
        return false; // Treat as safe if no image is provided
    }
    try {
        const axiosResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(axiosResponse.data);
        const mimeType = axiosResponse.headers['content-type'];

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const base64Image = imageBuffer.toString('base64');
        const prompt = "Check this image for any sexual abuse, hate speech, or inappropriate content. Respond with 'SAFE' if no such content is found, otherwise respond with 'UNSAFE'.";
        const image = {
            inlineData: {
                mimeType: mimeType,
                data: base64Image,
            },
        };
        const result = await model.generateContent([prompt, image]);
        const response = await result.response;
        const content = response.text();
        return content.trim().toUpperCase() === 'UNSAFE';
    } catch (error) {
        console.error('Error checking image for abuse with Gemini API:', error);
        return false; // Default to safe if API call fails
    }
};

module.exports = { checkTextForAbuse, checkImageForAbuse };