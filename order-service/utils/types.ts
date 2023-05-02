
export type User = {
    id: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    roelId: number;
}

export type Level = {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    merchants?: Merchant[];
}

export type Merchant = {
    id: number;
    name: string;
    userId: string;
    levelId: number;
    createdAt: Date;
    updatedAt: Date;
    user?: User | null;
    level?: Level;
}