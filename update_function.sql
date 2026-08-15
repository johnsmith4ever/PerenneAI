create or replace function match_aqa_specs (
  query_embedding vector(1024),
  match_threshold float,
  match_count int,
  filter_subject text,
  filter_level text,
  exclude_maths boolean default false
)
returns table (
  id uuid,
  subject text,
  level text,
  topic_code text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    aqa_specifications.id,
    aqa_specifications.subject,
    aqa_specifications.level,
    aqa_specifications.topic_code,
    aqa_specifications.content,
    1 - (aqa_specifications.embedding <=> query_embedding) as similarity
  from aqa_specifications
  where 
    (aqa_specifications.subject = filter_subject or filter_subject is null)
    and (aqa_specifications.level = filter_level or filter_level is null)
    and (not exclude_maths or aqa_specifications.subject != 'Mathematics')
    and 1 - (aqa_specifications.embedding <=> query_embedding) > match_threshold
  order by aqa_specifications.embedding <=> query_embedding
  limit match_count;
$$;
