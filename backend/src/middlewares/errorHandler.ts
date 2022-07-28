import { ErrorRequestHandler } from 'express';

import { HttpError } from '../utils';

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
	if (err instanceof HttpError) {
		return res.status(err.statusCode).send(err.serializeError());
	}
	res.send(err);
};

export { errorHandler };
