import * as fs from 'fs';
import * as path from 'path';
import { Promotion } from '../src/domain/entities/Promotion';
import { AmazonPromotionHtmlParser } from '../src/infrastructure/parsers/AmazonPromotionHtmlParser';

/**
 * Demonstra o funcionamento do scraper de promoções usando HTML salvo
 * Útil quando a Amazon bloqueia requisições diretas
 */
async function main() {
  console.log('=== Amazon Promotion Scraper - Demo com HTML Salvo ===\n');

  // Ler HTML salvo
  const htmlPath = path.join(__dirname, 'html', 'promotion', 'Amazon.com.br_ 20% off em Livros de Halloween promoção.html');
  
  if (!fs.existsSync(htmlPath)) {
    console.error('❌ Arquivo HTML não encontrado:', htmlPath);
    return;
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');
  console.log(`✅ HTML carregado: ${(html.length / 1024).toFixed(2)} KB\n`);

  // Criar parser
  const parser = new AmazonPromotionHtmlParser();

  // Extrair informações
  console.log('=== Extração de Dados ===\n');

  const { title, details } = parser.parsePromotionDetails(html);
  console.log('Título:', title);
  console.log('Detalhes:', details);
  console.log();

  const { type, value } = parser.parseDiscountInfo(title);
  console.log('Tipo de Desconto:', type);
  console.log('Valor do Desconto:', value + (type === 'percentage' ? '%' : ' BRL'));
  console.log();

  const { startDate, endDate } = parser.parseDates(details);
  console.log('=== Datas (Timezone de Brasília) ===');
  if (startDate) {
    console.log('Data Início:');
    console.log('  - ISO:', startDate.toISOString());
    console.log('  - Local (BRT):', startDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    console.log('  - Componentes:', {
      ano: startDate.getFullYear(),
      mês: startDate.getMonth() + 1,
      dia: startDate.getDate(),
      hora: startDate.getHours(),
      minuto: startDate.getMinutes()
    });
  }
  console.log();

  if (endDate) {
    console.log('Data Fim:');
    console.log('  - ISO:', endDate.toISOString());
    console.log('  - Local (BRT):', endDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    console.log('  - Componentes:', {
      ano: endDate.getFullYear(),
      mês: endDate.getMonth() + 1,
      dia: endDate.getDate(),
      hora: endDate.getHours(),
      minuto: endDate.getMinutes()
    });
    console.log('  - ✅ Data correta (31 de outubro):', 
      endDate.getFullYear() === 2025 && 
      endDate.getMonth() + 1 === 10 && 
      endDate.getDate() === 31);
  }
  console.log();

  const asins = parser.parseInitialAsins(html);
  console.log('=== Produtos (ASINs) ===');
  console.log(`Total de ASINs encontrados: ${asins.length}`);
  if (asins.length > 0) {
    console.log('\nPrimeiros 10 ASINs:');
    asins.slice(0, 10).forEach((asin, index) => {
      console.log(`  ${index + 1}. ${asin}`);
    });
    
    if (asins.length > 10) {
      console.log(`  ... e mais ${asins.length - 10} produtos`);
    }
  }
  console.log();

  // Criar entidade Promotion
  const promotionId = parser.extractPromotionId(html) || 'A2P3X1AN29HWHX';
  
  const promotion = new Promotion({
    id: promotionId,
    description: title,
    details,
    discountType: type,
    discountValue: value,
    startDate,
    endDate,
    asins,
  });

  console.log('=== Objeto Promotion Criado ===');
  console.log(`ID: ${promotion.id}`);
  console.log(`Descrição: ${promotion.description}`);
  console.log(`Produtos: ${promotion.asins.length}`);
  console.log();

  console.log('✅ Demonstração concluída com sucesso!');
  console.log('\n📝 Nota: A Amazon pode bloquear requisições diretas (503/403).');
  console.log('   O scraper funciona corretamente quando tem acesso ao HTML.');
  console.log('   Para requisições em produção, considere usar proxies ou headless browsers.');
}

main().catch(console.error);

