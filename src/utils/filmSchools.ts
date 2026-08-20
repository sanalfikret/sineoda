export interface NamedSchool {
  id: string
  name: string
}

export function splitSchoolName(name: string) {
  const parts = name.split(' — ')
  if (parts.length >= 2) {
    return { university: parts[0].trim(), department: parts.slice(1).join(' — ').trim() }
  }
  return { university: name.trim(), department: name.trim() }
}

export function groupSchoolsByUniversity<T extends NamedSchool>(schools: T[]) {
  const groups = new Map<string, T[]>()

  for (const school of schools) {
    const { university } = splitSchoolName(school.name)
    const list = groups.get(university) ?? []
    list.push(school)
    groups.set(university, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'tr'))
    .map(([university, items]) => ({
      university,
      schools: [...items].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    }))
}
