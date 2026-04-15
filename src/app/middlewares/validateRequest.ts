import { NextFunction, Request, Response } from "express";
import z from "zod";

export const validateRequest = (zodSchema: z.ZodTypeAny) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.body?.data && typeof req.body.data === "string") {
            req.body = JSON.parse(req.body.data)
        }

        const parsedResult = zodSchema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query,
        });

        if (!parsedResult.success) {
            return next(parsedResult.error)
        }

        if (parsedResult.data?.body !== undefined) {
            req.body = parsedResult.data.body;
        }

        if (parsedResult.data?.params !== undefined) {
            req.params = parsedResult.data.params;
        }

        if (parsedResult.data?.query !== undefined) {
            req.query = parsedResult.data.query;
        }

        next();
    }
}
