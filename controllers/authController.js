import prisma from "../lib/prisma.js"
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken"

 export const register = async (req, res, next) => {
    try {
        const {name, username, password} = req.body

        // username and password are not empty
        if(!name || !username || !password) {
            return res.status(403).json({error: 'name, username and password are required'})
        }

        //already in data?
        const existingUser = await prisma.user.findUnique({ where: { username }})
        if(existingUser) {
            return res.status(403).json({ error: 'user already exists'})
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        // add a new user
        const newUser = await prisma.user.create({
            data: {
                name,
                username,
                password: hashedPassword
            }
        })
        res.status(201).json({ 
            message: 'user registered successfully',
            userId: newUser.id
        })
    }catch (err) {
        next(err)
    }
}


export const login = async (req, res, next) => {
    try {
        const {username, password} = req.body
        const user = await prisma.user.findUnique({ 
            where: { username },
            include: {
                tees: true,
                likes: true,
                followers: true,
                followings: true
            }
        })

        if(!user) {
            return res.status(403).json({ error: 'Invalid username'})
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if(!isMatch) {
           return res.status(401).json({ error: 'Invalid password'})
        }

        const payload = {id: user.id, username: user.username}
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d'});

        res.status(201).json({
            message: 'login successful!',
            token: `Bearer ${token}`,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                tees: user.tees,
                likes: user.likes,
                followers: user.followers,
                followings: user.followings
            }
        })
    }catch(err) {
        next(err)
    }
}