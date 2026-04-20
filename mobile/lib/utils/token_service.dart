import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenService {
  static const _storage = FlutterSecureStorage();

  static Future<void> saveToken(String token) async =>
      await _storage.write(key: 'jwt_token', value: token);

  static Future<String?> getToken() async =>
      await _storage.read(key: 'jwt_token');

  static Future<bool> hasToken() async {
    String? token = await getToken();
    return token != null && token.isNotEmpty;
  }

  static Future<void> logout() async =>
      await _storage.delete(key: 'jwt_token');
}
