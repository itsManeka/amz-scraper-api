/**
 * Common Amazon category constants for helper/documentation purposes
 * The API accepts any category string - these are just convenient references
 */
export const Category = {
    /**
     * Books category (Portuguese: Livros)
     */
    LIVROS: 'Livros',

    /**
     * Electronics
     */
    ELETRONICOS: 'Eletrônicos',

    /**
     * Computers and Informatics
     */
    COMPUTADORES: 'Computadores e Informática',

    /**
     * Cell phones and communication
     */
    CELULARES: 'Celulares e Comunicação',

    /**
     * Home and Kitchen
     */
    CASA_COZINHA: 'Casa e Cozinha',

    /**
     * Sports and Outdoors
     */
    ESPORTES: 'Esportes e Aventura',

    /**
     * Toys and Games
     */
    BRINQUEDOS: 'Brinquedos e Jogos',

    /**
     * Baby products
     */
    BEBE: 'Bebês',

    /**
     * Fashion and Clothing
     */
    MODA: 'Moda',

    /**
     * Beauty and Personal Care
     */
    BELEZA: 'Beleza e Cuidado Pessoal',
} as const;

/**
 * Type representing valid category values
 */
export type CategoryValue = (typeof Category)[keyof typeof Category];

/**
 * Common book subcategories for reference
 */
export const BookSubcategory = {
    MANGA: 'Mangá HQs, Mangás e Graphic Novels',
    LITERATURA: 'Literatura e Ficção',
    AUTOAJUDA: 'Autoajuda',
    INFANTIL: 'Infantil',
    ROMANCE: 'Romance',
    SUSPENSE: 'Suspense e Thriller',
    NEGOCIOS: 'Negócios e Economia',
    HISTORIA: 'História',
} as const;

/**
 * Type representing valid book subcategory values
 */
export type BookSubcategoryValue = (typeof BookSubcategory)[keyof typeof BookSubcategory];
