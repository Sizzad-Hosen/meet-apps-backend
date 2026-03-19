import prisma from "../../../lib/prisma";

const registerUser = async (payload: any) => {
    // 1. check user exists
    const existingUser = await prisma.user.findUnique({
        where: {
            email: payload.email
        }
    });

    if (existingUser) {
        throw new Error("User already exists!");
    }

    // 2. create new user
    const newUser = await prisma.user.create({
        data: payload
    });
console.log("new user", newUser)

    return newUser;
};

const loginUser = async (payload: any) => {
    // 1. check user exists
    const existingUser = await prisma.user.findUnique({
        where: {
            email: payload.email
        }
    });

    if (!existingUser) {
        throw new Error("User does not exist!");
    }

    // 2. check password
    if (existingUser) {
        throw new Error("Invalid password!");
    }

    return existingUser;
};


export const AuthServices ={
    registerUser,
    loginUser
}