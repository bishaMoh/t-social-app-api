import prisma from "../lib/prisma.js";

// Rich include for tees: author info, like count, comments with authors
const teeInclude = {
    user: {
        select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true
        }
    },
    comments: {
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    profilePicture: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    },
    _count: {
        select: { likes: true, comments: true }
    }
};

//get AllTees
export const getAllTees = async (req, res, next) => {
    try{ 
        const tees = await prisma.tees.findMany({
            include: teeInclude,
            orderBy: { createdAt: 'desc' }
        });
        res.json(tees);
    }catch(err) {
        next(err);
    }
}

//get publishedTees
export const getPublishedTees = async (req, res, next) => {
    try {
        const tees = await prisma.tees.findMany({
            where: { published: true },
            include: teeInclude,
            orderBy: { createdAt: 'desc' }
        });
        res.json(tees);
    }catch(err) {
        next(err);
    }   
}

// get feed: posts from current user + users they follow (accepted)
export const getFeed = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Get IDs of users the current user is following (accepted)
        const following = await prisma.follow.findMany({
            where: {
                followerId: userId,
                status: 'ACCEPTED'
            },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);
        // Include the current user's own posts
        const feedUserIds = [userId, ...followingIds];

        const tees = await prisma.tees.findMany({
            where: {
                userId: { in: feedUserIds },
                published: true
            },
            include: {
                ...teeInclude,
                likes: {
                    where: { userId },
                    select: { id: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Add a `likedByMe` flag to each tee
        const feed = tees.map(tee => ({
            ...tee,
            likedByMe: tee.likes.length > 0,
            likes: undefined // remove the raw likes array, we have _count
        }));

        res.json(feed);
    } catch(err) {
        next(err);
    }
}

// Personalized "For You" feed: trending + interest-based discovery
export const getForYouFeed = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const preferences = await prisma.userPreferences.findUnique({
            where: { userId },
        });
        const interests = preferences?.interests || [];

        const following = await prisma.follow.findMany({
            where: { followerId: userId, status: 'ACCEPTED' },
            select: { followingId: true },
        });
        const followingIds = following.map((f) => f.followingId);

        const tees = await prisma.tees.findMany({
            where: {
                published: true,
                userId: { not: userId },
            },
            include: {
                ...teeInclude,
                likes: {
                    where: { userId },
                    select: { id: true },
                },
                _count: {
                    select: { likes: true, comments: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        const scored = tees.map((tee) => {
            let score = tee._count.likes * 2 + tee._count.comments;
            if (!followingIds.includes(tee.userId)) score += 5;
            if (interests.length > 0) {
                const lowerText = tee.text.toLowerCase();
                for (const interest of interests) {
                    if (lowerText.includes(interest.toLowerCase())) score += 10;
                }
            }
            return {
                ...tee,
                likedByMe: tee.likes.length > 0,
                likes: undefined,
                score,
            };
        });

        scored.sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt));
        res.json(scored.slice(0, 40));
    } catch (err) {
        next(err);
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
                published: published !== undefined ? published : true,
                userId,
            },
            include: teeInclude
        })
        res.status(201).json({
            message: 't created',
            tee: t
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
            },
            include: teeInclude
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
            message: 't deleted successfully'
        })
    }catch (err) {
        next(err)
    }
}