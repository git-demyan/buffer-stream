export class HttpError extends Error {
	public statusCode = 500;
	public message = 'An error occurred';

	constructor(message: string, statusCode?: number) {
		super(message);

		if (statusCode) {
			this.statusCode = statusCode;
		}

		this.message = message;

		Object.setPrototypeOf(this, HttpError.prototype);
	}

	serializeError() {
		return { status: this.statusCode, message: this.message };
	}
}
