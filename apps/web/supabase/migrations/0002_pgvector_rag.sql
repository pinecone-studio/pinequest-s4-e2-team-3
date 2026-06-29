-- Real pgvector RAG: store place embeddings in a vector column and search them
-- in-database, instead of loading a JSON file and doing cosine in JS.
-- Run in the Supabase SQL editor (after 0001).

-- 1. pgvector extension
create extension if not exists vector;

-- 2. Embedding column on places (OpenAI text-embedding-3-small = 1536 dims)
alter table public.places
  add column if not exists embedding vector(1536);

-- 3. ANN index for cosine similarity (used as the catalog grows)
create index if not exists places_embedding_idx
  on public.places using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 4. RAG search function: nearest custom places by cosine, above a threshold.
create or replace function public.match_places(
  query_embedding vector(1536),
  match_threshold float default 0.3,
  match_count int default 15
)
returns setof public.places
language sql
stable
as $$
  select *
  from public.places
  where embedding is not null
    and 1 - (embedding <=> query_embedding) >= match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
