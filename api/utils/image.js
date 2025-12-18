import axios from 'axios';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

const saveImageFromUrl = async (imageUrl) => {
    const uploadsDir = path.resolve('uploads/profile_pictures');
    const filepath = path.join(uploadsDir, filename);

    // Ensure directory exists
    fs.mkdirSync(uploadsDir, { recursive: true });

    const writer = fs.createWriteStream(filepath);
    const response = await axios({
        url: imageUrl,
        method: 'GET',
        responseType: 'stream',
    });

    const contentType = response.headers['content-type'];
    const ext = mime.extension(contentType) || 'jpg';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(`/uploads/profile_pictures/${filename}`));
        writer.on('error', reject);
    });
};

export default saveImageFromUrl;