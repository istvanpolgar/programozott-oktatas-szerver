const Joi = require('joi');

const signupSchema = Joi.object({
    name: Joi.string().min(3).max(128).required().messages({
        "string.base": `A Név mező csak szöveg típusú lehet!`,
        "string.empty": `A Név mező nem lehet üres!`,
        "string.min": `A Név mező legalább 3 karakter hosszú kell legyen!`,
        "string.max": `A Név mező fegfennebb 128 karakter hosszú lehet!`,
        "any.required": `A Név mező kötelező!`,
    }),
    email: Joi.string().email().min(8).max(256).required().messages({
        "string.base": `Az E-mail Név mező csak szöveg típusú lehet!`,
        "string.empty": `Az E-mail mező nem lehet üres!`,
        "string.min": `Az E-mail mező legalább 8 karakter hosszú kell legyen!`,
        "string.max": `Az E-mail mező fegfennebb 256 karakter hosszú lehet!`,
        "string.email": `Az e-mial címnek valósnak kell lennie!`,
        "any.required": `Az E-mail mező kötelező!`,
    }),
    password: Joi.string().min(3).max(128).required().messages({
        "string.base": `A Jelszó mező csak szöveg típusú lehet!`,
        "string.empty": `A Jelszó mező nem lehet üres!`,
        "string.min": `A Jelszó mező legalább 3 karakter hosszú kell legyen!`,
        "string.max": `A Jelszó mező fegfennebb 128 karakter hosszú lehet!`,
        "any.required": `A Jelszó mező kötelező!`,
    }),
    _password: Joi.string().valid(Joi.ref('password')).required().messages({
        "string.base": `A Jelszó újra mező csak szöveg típusú lehet!`,
        "string.empty": `A Jelszó újra mező nem lehet üres!`,
        "string.min": `A Jelszó újra mező legalább 3 karakter hosszú kell legyen!`,
        "string.max": `A Jelszó újra mező fegfennebb 128 karakter hosszú lehet!`,
        "any.required": `A Jelszó újra mező kötelező!`,
    }),
})

module.exports = signupSchema;