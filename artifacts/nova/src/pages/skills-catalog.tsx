import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SkillMeta {
  name: string;
  description: string;
  tags: string[];
}

interface SkillsResponse {
  count: number;
  skills: SkillMeta[];
}

async function fetchSkills(): Promise<SkillsResponse> {
  const res = await fetch("/api/skills");
  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json();
}

async function fetchSkillDetail(name: string): Promise<string> {
  const res = await fetch(`/api/skills/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error("Skill not found");
  const data = await res.json();
  return data.content || data.description || "";
}

function SkillCard({ skill, onClick }: { skill: SkillMeta; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono">{skill.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-500 line-clamp-2">{skill.description}</p>
        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skill.tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SkillsCatalog() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<SkillsResponse>({
    queryKey: ["skills"],
    queryFn: fetchSkills,
  });

  const { data: detail, isFetching: detailLoading } = useQuery<string>({
    queryKey: ["skill", selectedSkill],
    queryFn: () => fetchSkillDetail(selectedSkill!),
    enabled: !!selectedSkill,
  });

  const filteredSkills = (data?.skills || []).filter(skill => {
    const matchesSearch =
      !search ||
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "osint") return skill.name.includes("osint") || skill.tags.includes("osint");
    if (activeTab === "composio") return skill.name.includes("composio");
    if (activeTab === "voltagent") return skill.name.includes("voltagent") || skill.name.includes("awesome-agent");
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600">⚡</span> Nova Skills Catalog
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {data?.count ?? 0} skills loaded — superpowers · composio · voltagent · osint
            </p>
          </div>
          <a
            href="https://github.com/ABBYCRM/Nova-Aura-Tools"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="text-xs">View on GitHub</Button>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>Failed to load skills. Is the server running?</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="all">All Skills</TabsTrigger>
              <TabsTrigger value="osint">🕵️ OSINT</TabsTrigger>
              <TabsTrigger value="composio">⚡ Composio</TabsTrigger>
              <TabsTrigger value="voltagent">🔌 VoltAgent</TabsTrigger>
            </TabsList>
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </Tabs>

        <div className="flex gap-6">
          {/* Skills Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
                    <CardContent><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4 mt-1" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">No skills found</p>
                <p className="text-sm mt-1">Try a different search or tab</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSkills.map(skill => (
                  <SkillCard
                    key={skill.name}
                    skill={skill}
                    onClick={() => setSelectedSkill(skill.name)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedSkill && (
            <div className="w-96 shrink-0 hidden lg:block">
              <Card className="sticky top-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono">{selectedSkill}</CardTitle>
                </CardHeader>
                <CardContent>
                  {detailLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ) : detail ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {detail}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-gray-400">No details available</p>
                  )}
                </CardContent>
                <div className="px-4 pb-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSkill(null)} className="w-full">
                    Close
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
