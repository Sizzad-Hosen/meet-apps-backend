import dotenv from 'dotenv'

import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {

    env:process.env.NODE_ENV,
    port:process.env.PORT,
    jwt:{
        
 jwt_secret:process.env.JWT_SECRET,
 expires_in:process.env.EXPIRE_IN ,
 refresh_token_secret:process.env.REFRESH_TOKEN_SECRET,
 refresh_token_expires_in:process.env.REFRESH_TOKEN_EXPIRES_IN ,
 reset_pass_secret:process.env.RESET_PASS_TOKEN,
 reset_pass_token_expires_in:process.env.RESET_PASS_TOKEN_EXPIRES_IN

    },

reset_pass_link:process.env.RESET_PASS_URL,
email:process.env.EMAIL,
app_pass:process.env.APP_PASS,
salt_round:process.env.SALT_ROUND,
cloudinary_name:process.env.CLOUDINARY_CLOUD_NAME,
cloudinary_api_key:process.env.CLOUDINARY_API_KEY,
cloudinary_api_secret:process.env.CLOUDINARY_API_SECRET,

}