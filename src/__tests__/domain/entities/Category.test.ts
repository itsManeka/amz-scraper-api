import {
    Category,
    BookSubcategory,
    CategoryValue,
    BookSubcategoryValue,
} from '../../../domain/entities/Category';

describe('Category', () => {
    describe('Category constants', () => {
        it('should have LIVROS category defined', () => {
            expect(Category.LIVROS).toBe('Livros');
        });

        it('should have ELETRONICOS category defined', () => {
            expect(Category.ELETRONICOS).toBe('Eletrônicos');
        });

        it('should have COMPUTADORES category defined', () => {
            expect(Category.COMPUTADORES).toBe('Computadores e Informática');
        });

        it('should have CELULARES category defined', () => {
            expect(Category.CELULARES).toBe('Celulares e Comunicação');
        });

        it('should have CASA_COZINHA category defined', () => {
            expect(Category.CASA_COZINHA).toBe('Casa e Cozinha');
        });

        it('should have ESPORTES category defined', () => {
            expect(Category.ESPORTES).toBe('Esportes e Aventura');
        });

        it('should have BRINQUEDOS category defined', () => {
            expect(Category.BRINQUEDOS).toBe('Brinquedos e Jogos');
        });

        it('should have BEBE category defined', () => {
            expect(Category.BEBE).toBe('Bebês');
        });

        it('should have MODA category defined', () => {
            expect(Category.MODA).toBe('Moda');
        });

        it('should have BELEZA category defined', () => {
            expect(Category.BELEZA).toBe('Beleza e Cuidado Pessoal');
        });

        it('should have all category keys defined', () => {
            const keys = Object.keys(Category);
            expect(keys).toContain('LIVROS');
            expect(keys).toContain('ELETRONICOS');
            expect(keys).toContain('COMPUTADORES');
            expect(keys).toContain('CELULARES');
            expect(keys).toContain('CASA_COZINHA');
            expect(keys).toContain('ESPORTES');
            expect(keys).toContain('BRINQUEDOS');
            expect(keys).toContain('BEBE');
            expect(keys).toContain('MODA');
            expect(keys).toContain('BELEZA');
        });
    });

    describe('BookSubcategory constants', () => {
        it('should have MANGA subcategory defined', () => {
            expect(BookSubcategory.MANGA).toBe('Mangá HQs, Mangás e Graphic Novels');
        });

        it('should have LITERATURA subcategory defined', () => {
            expect(BookSubcategory.LITERATURA).toBe('Literatura e Ficção');
        });

        it('should have AUTOAJUDA subcategory defined', () => {
            expect(BookSubcategory.AUTOAJUDA).toBe('Autoajuda');
        });

        it('should have INFANTIL subcategory defined', () => {
            expect(BookSubcategory.INFANTIL).toBe('Infantil');
        });

        it('should have ROMANCE subcategory defined', () => {
            expect(BookSubcategory.ROMANCE).toBe('Romance');
        });

        it('should have SUSPENSE subcategory defined', () => {
            expect(BookSubcategory.SUSPENSE).toBe('Suspense e Thriller');
        });

        it('should have NEGOCIOS subcategory defined', () => {
            expect(BookSubcategory.NEGOCIOS).toBe('Negócios e Economia');
        });

        it('should have HISTORIA subcategory defined', () => {
            expect(BookSubcategory.HISTORIA).toBe('História');
        });

        it('should have FANTASY_GRAPHIC_NOVELS subcategory defined', () => {
            expect(BookSubcategory.FANTASY_GRAPHIC_NOVELS).toBe('Fantasia em Graphic Novels');
        });

        it('should have MYSTERY_GRAPHIC_NOVELS subcategory defined', () => {
            expect(BookSubcategory.MYSTERY_GRAPHIC_NOVELS).toBe('Mistério em Graphic Novels');
        });

        it('should have HORROR_GRAPHIC_NOVELS subcategory defined', () => {
            expect(BookSubcategory.HORROR_GRAPHIC_NOVELS).toBe('Horror em Graphic Novels');
        });

        it('should have LITERARY_GRAPHIC_NOVELS subcategory defined', () => {
            expect(BookSubcategory.LITERARY_GRAPHIC_NOVELS).toBe('Literárias em Graphic Novels');
        });

        it('should have all book subcategory keys defined', () => {
            const keys = Object.keys(BookSubcategory);
            expect(keys).toHaveLength(12);
            expect(keys).toContain('MANGA');
            expect(keys).toContain('LITERATURA');
            expect(keys).toContain('AUTOAJUDA');
        });
    });

    describe('TypeScript types', () => {
        it('should allow CategoryValue type to accept valid categories', () => {
            const category: CategoryValue = Category.LIVROS;
            expect(category).toBe('Livros');
        });

        it('should allow BookSubcategoryValue type to accept valid subcategories', () => {
            const subcategory: BookSubcategoryValue = BookSubcategory.MANGA;
            expect(subcategory).toBe('Mangá HQs, Mangás e Graphic Novels');
        });
    });
});
