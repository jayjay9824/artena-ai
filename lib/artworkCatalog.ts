/**
 * Artwork catalog — minimal in-memory dataset for vector search MVP.
 *
 * Each entry pre-computes a stub embedding from "{artist} | {title} |
 * {styleSeed}". When a real multimodal embedding model is wired in
 * (CLIP / Cohere / Voyage), regenerate these embeddings from actual
 * image data and replace the stub function in services/ai/embeddingService.
 *
 * Catalog is intentionally small (~30 entries) — it exists to prove the
 * pipeline. Production scale belongs in a vector DB (Pinecone / Weaviate
 * / Supabase pgvector) so the in-memory list never exceeds this size.
 */

import { stubEmbed } from '@/services/ai/embeddingService';

export type CatalogEntry = {
  id: string;
  artist: string;
  title: string;
  year?: string;
  medium?: string;
  embedding: number[];
};

type Seed = Omit<CatalogEntry, 'embedding'> & { styleSeed: string };

const SEEDS: Seed[] = [
  // Impressionism
  { id: 'monet-waterlilies',     artist: 'Claude Monet',           title: 'Water Lilies',                   year: '1916',  medium: 'Oil on canvas', styleSeed: 'impressionism pond reflection blue green' },
  { id: 'monet-impression-sunrise', artist: 'Claude Monet',        title: 'Impression, Sunrise',            year: '1872',  medium: 'Oil on canvas', styleSeed: 'impressionism harbor sunrise orange haze' },
  { id: 'renoir-bal-galette',    artist: 'Pierre-Auguste Renoir',  title: 'Bal du moulin de la Galette',    year: '1876',  medium: 'Oil on canvas', styleSeed: 'impressionism crowd dance dappled light' },
  // Post-impressionism
  { id: 'vangogh-starry-night',  artist: 'Vincent van Gogh',       title: 'The Starry Night',               year: '1889',  medium: 'Oil on canvas', styleSeed: 'post-impressionism night swirl blue yellow' },
  { id: 'vangogh-sunflowers',    artist: 'Vincent van Gogh',       title: 'Sunflowers',                     year: '1888',  medium: 'Oil on canvas', styleSeed: 'post-impressionism still life yellow flowers' },
  { id: 'cezanne-bathers',       artist: 'Paul Cézanne',           title: 'The Large Bathers',              year: '1906',  medium: 'Oil on canvas', styleSeed: 'post-impressionism bathers blue ochre' },
  // Cubism / Modern
  { id: 'picasso-demoiselles',   artist: 'Pablo Picasso',          title: 'Les Demoiselles d\'Avignon',     year: '1907',  medium: 'Oil on canvas', styleSeed: 'cubism figures pink ochre fragmentation' },
  { id: 'picasso-guernica',      artist: 'Pablo Picasso',          title: 'Guernica',                       year: '1937',  medium: 'Oil on canvas', styleSeed: 'cubism war monochrome black white grey' },
  { id: 'matisse-dance',         artist: 'Henri Matisse',          title: 'The Dance',                      year: '1910',  medium: 'Oil on canvas', styleSeed: 'fauvism figures red green simplified' },
  { id: 'mondrian-composition',  artist: 'Piet Mondrian',          title: 'Composition with Red Blue Yellow', year: '1930', medium: 'Oil on canvas', styleSeed: 'de stijl grid primary geometric' },
  // Surrealism
  { id: 'dali-persistence',      artist: 'Salvador Dalí',          title: 'The Persistence of Memory',      year: '1931',  medium: 'Oil on canvas', styleSeed: 'surrealism melting clocks desert' },
  { id: 'magritte-son-of-man',   artist: 'René Magritte',          title: 'The Son of Man',                 year: '1964',  medium: 'Oil on canvas', styleSeed: 'surrealism bowler hat apple suit' },
  // Abstract Expressionism
  { id: 'rothko-no-14',          artist: 'Mark Rothko',            title: 'No. 14',                         year: '1960',  medium: 'Oil on canvas', styleSeed: 'abstract expressionism color field red orange' },
  { id: 'rothko-orange-red-yellow', artist: 'Mark Rothko',         title: 'Orange, Red, Yellow',            year: '1961',  medium: 'Oil on canvas', styleSeed: 'abstract expressionism color field warm' },
  { id: 'pollock-no-5',          artist: 'Jackson Pollock',        title: 'No. 5, 1948',                    year: '1948',  medium: 'Drip on fiberboard', styleSeed: 'abstract expressionism drip splatter brown yellow' },
  { id: 'kandinsky-composition-viii', artist: 'Wassily Kandinsky', title: 'Composition VIII',               year: '1923',  medium: 'Oil on canvas', styleSeed: 'abstract geometric circles lines' },
  // Pop / Contemporary
  { id: 'warhol-marilyn',        artist: 'Andy Warhol',            title: 'Marilyn Diptych',                year: '1962',  medium: 'Acrylic on canvas', styleSeed: 'pop art portrait silkscreen repetition' },
  { id: 'warhol-soup-cans',      artist: 'Andy Warhol',            title: 'Campbell\'s Soup Cans',          year: '1962',  medium: 'Synthetic polymer', styleSeed: 'pop art soup can repetition red white' },
  { id: 'lichtenstein-drowning', artist: 'Roy Lichtenstein',       title: 'Drowning Girl',                  year: '1963',  medium: 'Oil and acrylic on canvas', styleSeed: 'pop art comic dots blue yellow' },
  { id: 'kusama-pumpkin',        artist: 'Yayoi Kusama',           title: 'Pumpkin',                        year: '1994',  medium: 'Mixed media',  styleSeed: 'contemporary polka dots yellow black' },
  // Classical / Renaissance
  { id: 'vermeer-girl-pearl',    artist: 'Johannes Vermeer',       title: 'Girl with a Pearl Earring',      year: '1665',  medium: 'Oil on canvas', styleSeed: 'baroque portrait turban pearl blue yellow' },
  { id: 'davinci-mona-lisa',     artist: 'Leonardo da Vinci',      title: 'Mona Lisa',                      year: '1503',  medium: 'Oil on poplar', styleSeed: 'renaissance portrait smile sfumato' },
  { id: 'michelangelo-creation', artist: 'Michelangelo',           title: 'The Creation of Adam',           year: '1512',  medium: 'Fresco',        styleSeed: 'renaissance fresco hands god adam' },
  // Korean masters
  { id: 'kimwhanki-04-vi-69',    artist: 'Kim Whanki',             title: '04-VI-69 #94',                   year: '1969',  medium: 'Oil on cotton', styleSeed: 'korean abstract dots blue grid' },
  { id: 'parkseobo-ecriture',    artist: 'Park Seo-bo',            title: 'Écriture',                       year: '1985',  medium: 'Mixed media',   styleSeed: 'dansaekhwa repetitive lines monochrome' },
  { id: 'leeufan-from-line',     artist: 'Lee Ufan',               title: 'From Line',                      year: '1978',  medium: 'Pigment on canvas', styleSeed: 'mono-ha vertical line blue gradient' },
  { id: 'leejungseob-bull',      artist: 'Lee Jung-seob',          title: 'White Bull',                     year: '1954',  medium: 'Oil on canvas', styleSeed: 'korean expressionism bull energy white' },
  { id: 'namjunepaik-tv-buddha', artist: 'Nam June Paik',          title: 'TV Buddha',                      year: '1974',  medium: 'Video sculpture', styleSeed: 'video art buddha closed circuit television' },
  // Contemporary photographers
  { id: 'sugimoto-seascape',     artist: 'Hiroshi Sugimoto',       title: 'Seascape',                       year: '1980',  medium: 'Gelatin silver print', styleSeed: 'photography horizon seascape long exposure' },
  // Other modern
  { id: 'munch-scream',          artist: 'Edvard Munch',           title: 'The Scream',                     year: '1893',  medium: 'Tempera and pastel on cardboard', styleSeed: 'expressionism scream orange swirl figure' },
];

/**
 * The exported catalog with pre-computed stub embeddings.
 * Each embedding is derived from the artwork's text seed via a
 * deterministic hash — they're stable across runs but do NOT
 * encode visual semantics. Real production catalog should embed
 * actual image data with a multimodal model.
 */
export const ARTWORK_CATALOG: CatalogEntry[] = SEEDS.map(({ styleSeed, ...rest }) => ({
  ...rest,
  embedding: stubEmbed(`${rest.artist} | ${rest.title} | ${styleSeed}`),
}));
