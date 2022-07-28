import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import md5 from 'md5';
import bodyParser from 'body-parser';
import { existsSync, renameSync, unlinkSync, appendFileSync } from 'fs';

import { errorHandler } from './middlewares';
import { HttpError } from './utils';

interface Query {
	name: string;
	currentChunkIndex: string;
	totalChunks: string;
}

const validFileExtensions = ['mp4', 'avi', 'mkv'];

const uploadsDir = `${__dirname}/../uploads`;
const PORT = process.env.PORT;
const app = express();

// middlewares
app.use(cors());
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '1mb' }));

app.get('/', (req, res) => {
	res.send('Express + TypeScript Server');
});

app.post('/api/upload', (req, res) => {
	const { name, currentChunkIndex, totalChunks } =
		req.query as unknown as Query;

	const firstChunk = parseInt(currentChunkIndex) === 0;
	const lastChunk = parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;
	const ext = name.split('.').pop();

	if (!ext || (ext && !validFileExtensions.includes(ext))) {
		throw new HttpError('Invalid file(s) type', 413);
	}

	const data = req.body.toString().split(',')[1];
	const buffer = Buffer.from(data, 'base64');
	const tmpFilename = 'tmp_' + md5(name + req.ip) + '.' + ext;
	if (firstChunk && existsSync(`${uploadsDir}/${tmpFilename}`)) {
		unlinkSync(`${uploadsDir}/${tmpFilename}`);
	}
	appendFileSync(`${uploadsDir}/${tmpFilename}`, buffer);
	if (lastChunk) {
		const finalFilename = md5(`${Date.now()}`).substr(0, 6) + '.' + ext;
		renameSync(
			`${uploadsDir}/${tmpFilename}`,
			`${uploadsDir}/${finalFilename}`
		);
		res.json({ finalFilename });
	} else {
		res.json('ok');
	}
});

app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
