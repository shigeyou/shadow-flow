"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PRESET_THEMES, Theme } from "@/types";
import {
  Briefcase,
  Coffee,
  Plane,
  ShoppingBag,
  Users,
  MessageCircle,
  Sparkles,
  Bot,
  Cpu,
  Flag,
  Globe,
  Building2,
  Rocket,
  FlaskConical,
  Leaf,
  Coins,
  BarChart3,
  Search,
  Repeat,
} from "lucide-react";

interface ThemeSelectorProps {
  onSelectTheme: (theme: Theme) => void;
  onStartContinuousMode: () => void;
  isLoading: boolean;
}

const themeIcons: Record<string, React.ReactNode> = {
  // Basic themes
  meeting: <Users className="h-5 w-5" />,
  business: <Briefcase className="h-5 w-5" />,
  restaurant: <Coffee className="h-5 w-5" />,
  travel: <Plane className="h-5 w-5" />,
  shopping: <ShoppingBag className="h-5 w-5" />,
  smalltalk: <MessageCircle className="h-5 w-5" />,
  japan: <Flag className="h-5 w-5" />,
  // Search themes (12 themes)
  "ai-global": <Bot className="h-5 w-5" />,
  "ai-japan": <Bot className="h-5 w-5" />,
  "tech-global": <Cpu className="h-5 w-5" />,
  "tech-japan": <Cpu className="h-5 w-5" />,
  "economy-global": <Globe className="h-5 w-5" />,
  "economy-japan": <Building2 className="h-5 w-5" />,
  "startup-global": <Rocket className="h-5 w-5" />,
  "startup-japan": <Rocket className="h-5 w-5" />,
  "science-tech": <FlaskConical className="h-5 w-5" />,
  "energy-environment": <Leaf className="h-5 w-5" />,
  "finance-investment": <Coins className="h-5 w-5" />,
  "business-trends": <BarChart3 className="h-5 w-5" />,
};

export function ThemeSelector({
  onSelectTheme,
  onStartContinuousMode,
  isLoading,
}: ThemeSelectorProps) {
  const [customTheme, setCustomTheme] = useState("");

  const basicThemes = PRESET_THEMES.filter((t) => !t.requiresSearch);
  const searchThemes = PRESET_THEMES.filter((t) => t.requiresSearch);

  const handlePresetSelect = (theme: Theme) => {
    onSelectTheme(theme);
  };

  const handleCustomSubmit = () => {
    if (customTheme.trim()) {
      onSelectTheme({
        id: "custom",
        name: customTheme.trim(),
        nameJa: customTheme.trim(),
        description: "Custom theme",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search-powered Themes */}
      <Card className="border-2 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-500" />
            <Badge className="bg-blue-500">Live</Badge>
            Latest News and Trends from the Internet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {searchThemes.map((theme) => (
              <Button
                key={theme.id}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 border-blue-500/30 hover:border-blue-500"
                onClick={() => handlePresetSelect(theme)}
                disabled={isLoading}
              >
                {themeIcons[theme.id]}
                <span className="font-medium">{theme.nameJa}</span>
                <span className="text-xs text-muted-foreground">
                  {theme.name}
                </span>
              </Button>
            ))}
          </div>
          <Button
            onClick={onStartContinuousMode}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            <Repeat className="h-4 w-4 mr-2" />
            {isLoading ? "Loading..." : "Continuous Learning Mode (All 12 Themes)"}
          </Button>
        </CardContent>
      </Card>

      {/* Custom Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Custom Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your custom theme... (e.g., 'Job interview', 'Doctor visit', 'Tech presentation')"
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            className="min-h-[80px]"
            disabled={isLoading}
          />
          <Button
            onClick={handleCustomSubmit}
            disabled={!customTheme.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? "Generating..." : "Generate Script"}
          </Button>
        </CardContent>
      </Card>

      {/* Basic Themes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary">Basic</Badge>
            Conversation Themes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {basicThemes.map((theme) => (
              <Button
                key={theme.id}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => handlePresetSelect(theme)}
                disabled={isLoading}
              >
                {themeIcons[theme.id]}
                <span className="font-medium">{theme.nameJa}</span>
                <span className="text-xs text-muted-foreground">
                  {theme.name}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
