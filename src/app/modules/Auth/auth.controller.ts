import { AuthServices } from "./auth.service"

const register = async (req: any, res: any) => {
    try {

        console.log("req body", req.body)
        const user = await AuthServices.registerUser(req.body);
        console.log("user", user)

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: (error as Error).message
        });
    }
};

const login = async (req: any, res: any) => {
    try {
        const user = await AuthServices.loginUser(req.body);
        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: (error as Error).message
        });
    }
};


export const AuthControllers ={
    register,
    login
}