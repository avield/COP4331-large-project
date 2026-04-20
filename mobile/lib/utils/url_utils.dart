class UrlUtils {
  static String getFullUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    // Ensure there is exactly one slash between the domain and the path
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return "https://taskademia.app$cleanPath";
  }
}
