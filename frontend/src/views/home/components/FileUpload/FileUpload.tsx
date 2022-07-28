import { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

interface IFile extends File {
	finalFilename?: string;
}

const validMimeTypes = ['video/mp4', 'video/x-msvideo', 'video/x-matroska'];
const validFileSize = 209715200; // 200Mb
const chunkSize = 1048576; // 1Mb

export default function FileUpload() {
	const [dropzoneActive, setDropzoneActive] = useState(false);
	const [files, setFiles] = useState<IFile[]>([]);
	const [validationMessage, setValidationMessage] = useState('');
	const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);
	const [lastUploadedFileIndex, setLastUploadedFileIndex] = useState<
		number | null
	>(null);
	const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(
		null
	);

	function handleDrop(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setValidationMessage('');
		// @ts-ignore
		const _files = [...files, ...e.dataTransfer.files];

		validation(_files);
	}

	function validation(_files: File[]) {
		try {
			console.log('_files', _files);
			// typeValidation(_files);
			// sizeValidation(_files);
			setFiles(_files);
		} catch (_err) {
			if (_err instanceof Error) {
				setValidationMessage(_err.message);
				console.log('_err', _err.message);
			}
		}
	}

	function typeValidation(_files: File[]) {
		const isValid = _files.every((file) => validMimeTypes.includes(file.type));
		if (!isValid) throw new Error('Invalid file(s) type');
	}

	function sizeValidation(_files: File[]) {
		const isValid = _files.every((file) => file.size <= validFileSize);
		if (!isValid) throw new Error('Invalid file(s) size');
	}

	function readAndUploadCurrentChunk() {
		const reader = new FileReader();
		if (
			typeof currentFileIndex === 'number' &&
			typeof currentChunkIndex === 'number'
		) {
			const file: IFile = files[currentFileIndex];
			if (!file) {
				return;
			}
			const from = currentChunkIndex * chunkSize;
			const to = from + chunkSize;
			const blob = file.slice(from, to);

			reader.onload = (e) => uploadChunk(e);
			reader.readAsDataURL(blob);
		}
	}

	function uploadChunk(readerEvent: any) {
		if (
			readerEvent !== null &&
			typeof currentFileIndex === 'number' &&
			typeof currentChunkIndex === 'number'
		) {
			const file = files[currentFileIndex];
			const data = readerEvent.target.result;

			const params = new URLSearchParams();
			params.set('name', file.name);
			params.set('size', file.size.toString());
			params.set('currentChunkIndex', currentChunkIndex.toString());
			params.set('totalChunks', `${Math.ceil(file.size / chunkSize)}`);

			const headers = { 'Content-Type': 'application/octet-stream' };
			const url = `${process.env.REACT_APP_API}/upload?${params.toString()}`;

			axios
				.post(url, data, { headers })
				.then((response) => {
					const file = files[currentFileIndex];
					const fileSize = files[currentFileIndex].size;
					const chunks = Math.ceil(fileSize / chunkSize) - 1;
					const isLastChunk = currentChunkIndex === chunks;
					if (isLastChunk) {
						file.finalFilename = response.data.finalFilename;
						setLastUploadedFileIndex(currentFileIndex);
						setCurrentChunkIndex(null);
					} else {
						setCurrentChunkIndex(currentChunkIndex + 1);
					}
				})
				.catch((err) => {
					setValidationMessage(`${err.response.status} - ${err.response.data}`);
					console.log('_err', err);
				});
		}
	}

	useEffect(() => {
		if (lastUploadedFileIndex === null) {
			return;
		}
		if (typeof currentFileIndex === 'number') {
			const isLastFile = lastUploadedFileIndex === files.length - 1;
			const nextFileIndex = isLastFile ? null : currentFileIndex + 1;
			setCurrentFileIndex(nextFileIndex);
		}
	}, [lastUploadedFileIndex]);

	useEffect(() => {
		if (files.length > 0) {
			if (currentFileIndex === null) {
				setCurrentFileIndex(
					lastUploadedFileIndex === null ? 0 : lastUploadedFileIndex + 1
				);
			}
		}
	}, [files.length]);

	useEffect(() => {
		if (currentFileIndex !== null) {
			setCurrentChunkIndex(0);
		}
	}, [currentFileIndex]);

	useEffect(() => {
		if (currentChunkIndex !== null) {
			readAndUploadCurrentChunk();
		}
	}, [currentChunkIndex]);

	return (
		<>
			<div
				onDragOver={(e) => {
					e.preventDefault();
					setDropzoneActive(true);
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					setDropzoneActive(false);
				}}
				onDrop={(e) => handleDrop(e)}
				className={'dropzone' + (dropzoneActive ? ' active' : '')}
			>
				Drop your files here
			</div>

			{validationMessage && (
				<h4 className='validation-error'>{validationMessage}</h4>
			)}

			<div className='files'>
				{files.map((file, fileIndex) => {
					let progress = 0;
					if (file.finalFilename) {
						progress = 100;
					} else {
						const uploading = fileIndex === currentFileIndex;
						const chunks = Math.ceil(file.size / chunkSize);
						if (uploading && typeof currentChunkIndex === 'number') {
							progress = Math.round((currentChunkIndex / chunks) * 100);
						} else {
							progress = 0;
						}
					}
					return (
						<a
							key={fileIndex}
							className='file'
							target='_blank'
							rel='noreferrer'
							href={`${process.env.REACT_APP_API}/upload/${file.finalFilename}`}
						>
							<div className='name'>{file.name}</div>
							<div
								className={'progress ' + (progress === 100 ? 'done' : '')}
								style={{ width: progress + '%' }}
							>
								{progress}%
							</div>
						</a>
					);
				})}
			</div>
		</>
	);
}
