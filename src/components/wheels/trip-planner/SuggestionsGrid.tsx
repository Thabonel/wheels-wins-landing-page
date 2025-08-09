
import { Card, CardContent } from "@/components/ui/card";
import { Suggestion } from "./types";

interface SuggestionsGridProps {
  suggestions: Suggestion[];
}

export default function SuggestionsGrid({ suggestions }: SuggestionsGridProps) {
  if (suggestions.length === 0) return null;

  return (
    <>
      <h3 className="text-xl font-semibold">Pam suggests:</h3>
      <div className="overflow-x-auto pb-4">
        <div className="flex space-x-4">
          {suggestions.map((item) => (
            <Card
              key={item.name}
              className="min-w-[280px] cursor-pointer hover:border-primary transition-colors"
            >
              <CardContent className="p-4">
                <h4 className="font-bold">{item.name}</h4>
                <p className="text-gray-600 text-sm">
                  {item.tags?.join(",") || item.type}
                </p>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm"
                >
                  Visit Website
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
