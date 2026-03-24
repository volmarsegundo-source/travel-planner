"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AtlasButton } from "@/components/ui";
import { ArrowRight } from "lucide-react";

interface HeroSectionV2Props {
  isAuthenticated?: boolean;
}

export function HeroSectionV2({ isAuthenticated = false }: HeroSectionV2Props) {
  const t = useTranslations("landingV2.hero");

  const handleScrollToPhases = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("fases");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] lg:min-h-[85vh] flex items-center overflow-hidden">
      {/* Background: Unsplash aerial travel photo + dark overlay for text legibility */}
      {/* Photo: aerial view of tropical island surrounded by mountains (j2bxM61qXQ4 by Peter Thomas) */}
      {/* Fallback: navy gradient if image fails to load */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat bg-atlas-primary"
          style={{
            backgroundImage: `linear-gradient(rgba(4, 13, 27, 0.65), rgba(4, 13, 27, 0.80)), url('https://images.unsplash.com/photo-1633511089809-fbe0483ca103?w=1920&q=80&fit=crop&auto=format')`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 md:px-12 w-full py-20">
        <div className="max-w-3xl space-y-8">
          {/* Badge pill */}
          <span className="inline-block py-1 px-3 rounded-full bg-atlas-secondary-container text-atlas-on-secondary-container text-xs font-bold uppercase tracking-widest">
            {t("badge")}
          </span>

          {/* Headline */}
          <h1 className="font-atlas-headline text-4xl md:text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
            {t("title")}
          </h1>

          {/* Subtitle */}
          <p className="text-white/80 font-atlas-body text-base md:text-lg lg:text-xl max-w-2xl leading-relaxed">
            {t("subtitle")}
          </p>

          {/* CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row flex-wrap gap-4">
            <Link href={isAuthenticated ? "/expeditions" : "/auth/register"}>
              <AtlasButton
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight className="size-5" />}
              >
                {t("cta")}
              </AtlasButton>
            </Link>
            <a href="#fases" onClick={handleScrollToPhases}>
              <AtlasButton variant="glass" size="lg">
                {t("secondaryCta")}
              </AtlasButton>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
