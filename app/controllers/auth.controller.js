const db = require('../models')const config = require('../../config/auth.config')const User = db.userconst Role = db.rolelet jwt = require('jsonwebtoken')let bcrypt = require('bcryptjs')const QRCode = require('qrcode')const fs = require('fs')const path = require('path')exports.signup = (req, res) => {  // Save user to DB  if (!req.body.username || !req.body.email || !req.body.password) {    res.status(400).send({ message: 'Content can not be empty!' })    return  }  User.create({    username: req.body.username,    email: req.body.email,    password: bcrypt.hashSync(req.body.password, 8)  }).then(user => {    delete user.password    Role.findOne({      where: {        id: 2 // "user" role      }    }).then(roles => {      user.setRoles(roles).then(() => {        res.send({ message: 'User was registered successfully', user: { user, roles } })      })    })  }).catch(err => {    res.status(500).send({      message: err.message    })  })}exports.signin = (req, res) => {  User.findOne({    where: { username: req.body.username }  }).then(user => {    if (!user) {      return res.status(404).send({ message: 'User not found!' })    }    let passwordIsValid = bcrypt.compareSync(      req.body.password,      user.password    )    if (!passwordIsValid) {      return res.status(401).send({        accessToken: null,        message: 'Invalid Password!' })    }    let token = jwt.sign({ id: user.id }, config.secret, {      expiresIn: 86400 // 24 hours    })    let authorities = []    user.getRoles().then(roles => {      for (let i = 0; i < roles.length; i++) {        authorities.push('ROLE_' + roles[i].name.toUpperCase())      }      res.status(200).send({        message: 'Singed successfully',        user: {          id: user.id,          username: user.username,          email: user.email,          roles: authorities,          accessToken: token        }      })    })  }).catch(err => {    res.status(500).send({ message: err.message })  })}exports.allUsers = async (req, res) => {  User.findAll()    .then(users => {      return res.status(200).send({ users })    }).catch(err => {      res.status(500).send({ message: err.message })  })}exports.signinQr = async (req, res) => {  let allUsersWithQR = []  const templatePath = path.join(__dirname + '/admin.png')  User.findAll()    .then(users => {      users.forEach(user => {        QRCode.toFile(templatePath, user, { width: 300, height: 300 },          function (err, url) {            fs.readFile(templatePath, { encoding: 'base64' }, function(err,data){              data = data.replace(/##qUrl/g, url)              allUsersWithQR.push({ image: data, user })            })          })      })      res.send(allUsersWithQR)    })}