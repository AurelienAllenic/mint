export function getTimeUntil(startDate: string | undefined, endDate: string | undefined): string {
    if (!startDate) return "";
    if (!endDate) return "";
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = start.getTime() - now.getTime();
    if (diffMs <= 0 && (end === null || end.getTime() > now.getTime())) {
      return "En cours";
    } else if (diffMs <= 0) {
      return "Terminé";
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const diffSeconds = Math.floor((diffMs / 1000) % 60);

    let result = "";
    if (diffDays > 0) result += `${diffDays}j `;
    if (diffHours > 0 || diffDays > 0) result += `${diffHours}h `;
    result += `${diffMinutes}min`;
    result += ` ${diffSeconds}s`;
    return result.trim();
  }
