import React, { createContext, useContext, useState, useEffect } from 'react';

const INITIAL_STATE = {
    name: "Student",
    xp: 0,
    level: 1,
    badges: [],
    completedLessons: [],
    streak: 1
};

const UserContext = createContext({ user: INITIAL_STATE, setUser: () => { }, addXP: () => { }, awardBadge: () => { }, completeLesson: () => { } });

export const useUser = () => useContext(UserContext);



export const UserProvider = ({ children }) => {
    // Load from local storage or default
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('edulab_user_v2');
            return saved ? JSON.parse(saved) : INITIAL_STATE;
        } catch (e) {
            return INITIAL_STATE;
        }
    });

    useEffect(() => {
        localStorage.setItem('edulab_user_v2', JSON.stringify(user));
    }, [user]);

    const addXP = (amount) => {
        setUser(prev => {
            const newXP = prev.xp + amount;
            // Level up every 100 XP
            const newLevel = Math.floor(newXP / 100) + 1;
            return { ...prev, xp: newXP, level: newLevel };
        });
    };

    const awardBadge = (badgeId, badgeName, icon) => {
        setUser(prev => {
            if (prev.badges.some(b => b.id === badgeId)) return prev;
            return {
                ...prev,
                badges: [...prev.badges, { id: badgeId, name: badgeName, icon, date: new Date().toISOString() }]
            };
        });
    };

    const completeLesson = (lessonId) => {
        setUser(prev => {
            if (prev.completedLessons.includes(lessonId)) return prev;
            return { ...prev, completedLessons: [...prev.completedLessons, lessonId] };
        });
    };

    return (
        <UserContext.Provider value={{ user, setUser, addXP, awardBadge, completeLesson }}>
            {children}
        </UserContext.Provider>
    );
};