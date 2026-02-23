type CategoryMeta = {
    label: string;
    description: string;
    icon: string;
};

const categoryMeta: Record<string, CategoryMeta> = {
    venue: {
        label: "Venues",
        description: "Find the perfect location for your event",
        icon: "🏛️"
    },
    catering: {
        label: "Catering",
        description: "Delicious food & beverage services",
        icon: "🍽️"
    },
    photography: {
        label: "Photography",
        description: "Capture every precious moment",
        icon: "📸"
    },
    decoration: {
        label: "Decoration",
        description: "Beautiful decor and floral design",
        icon: "🎊"
    },
    makeup: {
        label: "Makeup",
        description: "Professional beauty services",
        icon: "💄"
    },
    "dj-music": {
        label: "DJ & Music",
        description: "Sound, lights, and entertainment",
        icon: "🎵"
    },
    transport: {
        label: "Transport",
        description: "Reliable event transportation",
        icon: "🚗"
    }
};

const normalizeKey = (value: string) =>
    value
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

const titleCase = (value: string) =>
    value
        .replace(/[-_]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(" ");

export const getCategoryMeta = (value?: string) => {
    if (!value) {
        return {
            label: "Other",
            description: "Event services",
            icon: "🎉"
        };
    }
    const key = normalizeKey(value);
    return (
        categoryMeta[key] || {
            label: titleCase(value),
            description: "Event services",
            icon: "🎉"
        }
    );
};
