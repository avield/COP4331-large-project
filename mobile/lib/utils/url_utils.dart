class UrlUtils {
  static const String _backendBaseUrl = 'https://taskademia.app/api';

  static String getFullUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;

    final cleanPath = path.startsWith('/') ? path : '/$path';
    return "$_backendBaseUrl$cleanPath";
  }
}
