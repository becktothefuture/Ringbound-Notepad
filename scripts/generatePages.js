import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import chokidar from 'chokidar';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON Schema for portfolio data
const portfolioSchema = {
  type: 'object',
  required: ['projects'],
  properties: {
    projects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'pages'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          pages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['asset', 'type', 'commentary'],
              properties: {
                asset: { type: 'string' },
                type: { enum: ['image', 'video'] },
                commentary: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};

// Validate JSON against schema
const validatePortfolio = (data) => {
  const ajv = new Ajv();
  const validate = ajv.compile(portfolioSchema);
  const valid = validate(data);
  
  if (!valid) {
    throw new Error(`Invalid portfolio data: ${JSON.stringify(validate.errors)}`);
  }
  return true;
};

// Generate HTML for a single page
const generatePageHTML = (projectId, page) => {
  const assetPath = page.asset;
  const commentary = page.commentary || `Page ${page.index + 1} of ${projectId}`;
  
  if (page.type === 'image') {
    return `
      <div class="page" data-commentary="${commentary}">
        <div class="page-content">
          <img src="${assetPath}" loading="lazy" alt="${commentary}" class="page-content__inner" />
        </div>
      </div>
    `;
  } else {
    return `
      <div class="page" data-commentary="${commentary}">
        <div class="page-content">
          <video src="${assetPath}" loading="lazy" muted loop playsinline class="page-content__inner"></video>
        </div>
      </div>
    `;
  }
};

// Main generation function
const generatePages = () => {
  try {
    // Read and parse portfolio data
    const portfolioPath = path.join(process.cwd(), 'data', 'portfolio.json');
    const portfolioData = JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
    
    // Validate data
    validatePortfolio(portfolioData);
    
    // Generate HTML for all projects
    const pagesHTML = portfolioData.projects.map(project => {
      const projectPages = project.pages.map(page => 
        generatePageHTML(project.id, page)
      ).join('\n');
      
      return `
        <section id="${project.id}" class="chapter">
          <h2>${project.title}</h2>
          ${projectPages}
        </section>
      `;
    }).join('\n');
    
    // Read template
    const templatePath = path.join(process.cwd(), 'src', 'index.html');
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Replace placeholder with generated content
    template = template.replace(
      /<!-- GENERATED_PAGES -->(.|\n)*<!-- END_GENERATED_PAGES -->/,
      `<!-- GENERATED_PAGES -->\n${pagesHTML}\n<!-- END_GENERATED_PAGES -->`
    );
    
    // Write to dist
    const outputPath = path.join(process.cwd(), 'dist', 'index.html');
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    fs.writeFileSync(outputPath, template);
    
    console.log('✅ Pages generated successfully');
  } catch (error) {
    console.error('❌ Error generating pages:', error.message);
    // Don't exit in watch mode
    if (!process.argv.includes('--watch')) {
      process.exit(1);
    }
  }
};

// Check for --watch flag
if (process.argv.includes('--watch')) {
  const portfolioPath = path.join(process.cwd(), 'data', 'portfolio.json');
  const templatePath = path.join(process.cwd(), 'src', 'index.html');

  // Initial generation
  generatePages();
  
  // Watch for changes
  const watcher = chokidar.watch([portfolioPath, templatePath], {
    persistent: true,
  });
  
  watcher.on('change', (path) => {
    console.log(`\n📄 File changed: ${path}. Regenerating pages...`);
    generatePages();
  });
  
  console.log('\n👀 Watching for changes in portfolio data and template...');
} else {
  generatePages();
} 