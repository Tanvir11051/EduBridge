import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/edubridge";
import { cn } from "@/lib/utils";

const cache = new Map<string, string>();

export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(path && cache.get(path) ? cache.get(path)! : null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }
    const cached = cache.get(path);
    if (cached) {
      setUrl(cached);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!active || !data?.signedUrl) return;
        cache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

export function UserAvatar({
  name,
  path,
  className,
}: {
  name: string;
  path?: string | null | undefined;
  className?: string;
}) {
  const url = useAvatarUrl(path);
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {url && <AvatarImage src={url} alt={name} />}
      <AvatarFallback className="bg-accent text-sm font-medium text-accent-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
