import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private textToRouteMap: { [key: string]: string } = {};

  indexTextWithRoute(text: string, route: string) {
    const normalizedText = text.toLowerCase().trim();
    if (normalizedText) {
      this.textToRouteMap[normalizedText] = route;
    }
  }

  getRouteForText(query: string): string | undefined {
    const normalizedQuery = query.toLowerCase().trim();
    return this.textToRouteMap[normalizedQuery];
  }
}
