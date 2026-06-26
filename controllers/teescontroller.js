import prisma from "../lib/prisma.js";

//get AllTees
export const getAllTees = async (req, res, next) => {
    try{ 
        const tees = await prisma.tees.findMany({
        include: {
            user: {
                select: {
                    name: true,
                }
            }
        },
        orderBy: {createdAt: 'desc'}
    })
    res.json(tees)
    }catch(err) {
    next(err)
    }
}

//get publishedTees
export const getPublishedTees = async (req, res, next) => {
    try {
        const tees = await prisma.tees.findMany({
        where: { published: true},
        include: {
            user: {
                select: {
                    name: true,
                    username: true
                }
            }
        },
        orderBy: {createdAt: 'desc'}
    })
    res.json(tees)
    }catch(err) {
        next(err)
    }   
}

//create new t
export const newT = async (req, res, next) => {
    try {
        const { text, published } = req.body
        const userId = req.user.id

        if(!text) {
            return res.status(400).json({ error: 'can not post an empty t'})
        }

        const t = await prisma.tees.create({
            data:{
                text,
                published: published || false,
                userId,
            }
        })
        res.status(201).json({
            message: 't created',
            text
        })
    }catch(err) {
        next(err)
    }
}

//edit a T
export const editT = async (req, res, next) => {
    try {
        const {id} = req.params
        const userId = req.user.id
        const { text, published } = req.body

        const t = await prisma.tees.findUnique({
            where: { id: parseInt(id) }
        })

        if(!t) {
            return res.status(404).json({ error: 't not found'})
        }

        if(userId !== t.userId) {
            return res.status(403).json({ error: 'you can not edit this t'})
        }
        const edited = await prisma.tees.update({
            where: {id: parseInt(id)},
            data: {
                text: text !== undefined ? text: t.text,
                published: published !== undefined ? published: t.published
            }
        })
        res.status(201).json({ edited })
    }catch(err) {
        next(err)
    }
}

//delete a T
export const deleteT = async (req, res, next) => {
    try {
        const { id } = req.params
        const userId = req.user.id
        
        const t = await prisma.tees.findUnique({
            where: { id: parseInt(id) }
        })

        if(!t) {
            return res.status(404).json({ error: 't not found'})
        }
        
        if(userId !== t.userId) {
            return res.status(403).json({ error: 'you can not delete this t'})
        }

        await prisma.tees.delete({
            where: { id: parseInt(id) }
        })

        res.status(201).json({ 
            messege: 't deleted successfully'
        })
    }catch (err) {
        next(err)
    }
}