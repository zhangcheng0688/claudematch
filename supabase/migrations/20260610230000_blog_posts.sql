-- 20260610230000_blog_posts.sql
--
-- P2-deferred 2: 动态 sitemap 需要 blog_posts 表。
-- 我们目前 blog.tsx 是手写 3 篇文章（src/routes/blog.tsx 里的
-- BLOG_POSTS 数组），现在挪到 DB 让 sitemap + 未来真正的 blog
-- 编辑器能读同一个数据源。
--
-- Schema 极简：slug / title / excerpt / body / locale / published_at /
-- status. 不做评论 / 不做 tag / 不做作者头像 — 这是"v1 blog"，
-- 等真正做 marketing 页面再扩。

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh',  -- 'en' | 'zh' | 'yue'
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  author TEXT,
  -- 'draft' | 'published'. sitemap 只 emit published; SPA 端
  -- 也只查询 published。
  status TEXT NOT NULL DEFAULT 'draft',
  cover_image_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT blog_posts_status_valid
    CHECK (status IN ('draft', 'published')),
  CONSTRAINT blog_posts_locale_valid
    CHECK (locale IN ('en', 'zh', 'yue')),
  CONSTRAINT blog_posts_slug_per_locale_unique
    UNIQUE (slug, locale)
);

-- The hot read path: "give me all published posts for this locale,
-- ordered by published_at desc, with the sitemap-relevant fields only".
CREATE INDEX IF NOT EXISTS blog_posts_published_idx
  ON public.blog_posts (locale, status, published_at DESC)
  WHERE status = 'published';

-- updated_at trigger
DROP TRIGGER IF EXISTS blog_posts_set_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_set_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts (the SPA fetches them)
CREATE POLICY blog_posts_published_read ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- Writes are service-role only (founder / future admin UI).
-- (No policy = no anon/authenticated write access; service role
-- bypasses RLS.)