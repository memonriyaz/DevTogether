export enum ChannelType {
    COMBINED = 'combined'
}

export interface Channel {
    id: string;
    name: string;
    type: ChannelType;
    participants: string[]; // usernames
    createdBy?: string; // username of creator
    createdAt?: number; // timestamp
    description?: string; // channel description
}
