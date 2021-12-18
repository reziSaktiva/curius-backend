module.exports.validateRegisterInput = (
    username,
    email,
    password
) => {
    const errors = {};
    if(username.trim() === '') {
        errors.username = 'username tidak boleh kosong'
    }
    if(email.trim() === '') {
        errors.email = 'email tidak boleh kosong'
    }
    if (password === ''){
        errors.password = 'Password tidak boleh kosong'
    }

    return {
        errors,
        valid: Object.keys(errors).length < 1
    };
}

module.exports.validateLoginInput = (username, password) => {
    const errors = {};
    if(username.trim() === '') {
        errors.username = 'username tidak boleh kosong'
    } 
    if (password === ''){
        errors.password = 'Password tidak boleh kosong'
    }

    return {
        errors,
        valid: Object.keys(errors).length < 1
    }
}

module.exports.isValidPhoneNumber = phone => {
    const regexpPhone = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
    
    return new RegExp(regexpPhone).test(phone);
}

module.exports.isValidEmail = email => {
    if (!email) return false 

    const regexpMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return new RegExp(regexpMail).test(email);
}