const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "../src/app/escritorio/estrategia/portfolio/page.tsx");
let t = fs.readFileSync(p, "utf8");
t = t.replace(/type CatalogFilterOrigin = "all" \| "custom" \| "from_base";\r?\n/, "");
t = t.replace(/  const \[filterOrigin, setFilterOrigin\] = useState<CatalogFilterOrigin>\("all"\);\r?\n/, "");
t = t.replace(
  /    if \(filterOrigin === "custom"\) list = list\.filter\(\(s\) => s\.is_custom\);\r?\n    if \(filterOrigin === "from_base"\) list = list\.filter\(\(s\) => !s\.is_custom\);\r?\n/,
  ""
);
t = t.replace(/, filterOrigin/, "");
t = t.replace(/setFilterOrigin\("all"\);\r?\n    /, "");
const origBlock = `                <div className="space-y-1.5 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <Select
                    value={filterOrigin}
                    onChange={(e) => setFilterOrigin(e.target.value as CatalogFilterOrigin)}
                    aria-label="Filtrar por origem"
                  >
                    <option value="all">Todas</option>
                    <option value="custom">Customizado</option>
                    <option value="from_base">Catálogo base</option>
                  </Select>
                </div>
`;
t = t.split(origBlock).join("");
t = t.replace(
  /\s*\{service\.is_custom && \(\s*<div className="flex gap-1 flex-wrap">\s*<Badge variant="outline">Customizado<\/Badge>\s*<\/div>\s*\)\}/,
  ""
);
t = t.replace(
  /                    <th className="hidden md:table-cell px-3 py-2 font-medium">Descrição<\/th>\s*<th className="px-3 py-2 font-medium">Origem<\/th>/,
  `                    <th className="hidden md:table-cell px-3 py-2 font-medium">Descrição</th>`
);
t = t.replace(
  /                      <td className="hidden md:table-cell max-w-\[240px\] px-3 py-2 align-top text-muted-foreground">\s*<span className="line-clamp-2">\{service\.description \|\| "—"\}<\/span>\s*<\/td>\s*<td className="px-3 py-2 align-top">\s*\{service\.is_custom \? \(\s*<Badge variant="outline">Customizado<\/Badge>\s*\) : \(\s*<Badge variant="secondary">Catálogo base<\/Badge>\s*\)\}\s*<\/td>/,
  `                      <td className="hidden md:table-cell max-w-[240px] px-3 py-2 align-top text-muted-foreground">
                        <span className="line-clamp-2">{service.description || "—"}</span>
                      </td>`
);
fs.writeFileSync(p, t);
console.log("page patched");
