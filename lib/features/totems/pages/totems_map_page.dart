import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import '../../../core/network/dio_client.dart';
import '../../../core/widgets/app_scaffold.dart';

class TotemsMapPage extends ConsumerStatefulWidget {
  const TotemsMapPage({super.key});

  @override
  ConsumerState<TotemsMapPage> createState() => _TotemsMapPageState();
}

class _TotemsMapPageState extends ConsumerState<TotemsMapPage> {
  List<dynamic> _totems = [];
  bool _isLoading = true;
  LatLng? _userLocation;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await Future.wait([_loadTotems(), _getUserLocation()]);
  }

  Future<void> _loadTotems() async {
    try {
      final dioClient = ref.read(dioClientProvider);
      final response = await dioClient.dio.get('/totems/public');
      if (!mounted) return;
      setState(() {
        _totems = response.data['data'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  Future<void> _getUserLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );

      if (!mounted) return;
      setState(() {
        _userLocation = LatLng(position.latitude, position.longitude);
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _userLocation = LatLng(-22.9191, -42.8183);
      });
    }
  }

  Future<void> _openInMaps(double lat, double lng) async {
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng');
    if (await url_launcher.canLaunchUrl(uri)) {
      await url_launcher.launchUrl(uri, mode: url_launcher.LaunchMode.externalApplication);
    }
  }

  String _calcDistance(double lat, double lng) {
    if (_userLocation == null) return '';
    const distance = Distance();
    final meters = distance.as(
      LengthUnit.Meter,
      _userLocation!,
      LatLng(lat, lng),
    );
    if (meters < 1000) {
      return '${meters.toInt()}m';
    }
    return '${(meters / 1000).toStringAsFixed(1)}km';
  }

  @override
  Widget build(BuildContext context) {
    final center = _userLocation ?? LatLng(-22.9191, -42.8183);

    return AppScaffold(
      showBackButton: true,
      title: 'Totens de Apoio',
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Mapa
                Expanded(
                  flex: 3,
                  child: FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: center,
                      initialZoom: 14,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.example.vozdelas',
                      ),
                      // Marcador da usuária
                      if (_userLocation != null)
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: _userLocation!,
                              width: 40,
                              height: 40,
                              child: const Icon(
                                Icons.my_location,
                                color: Colors.blue,
                                size: 30,
                              ),
                            ),
                          ],
                        ),
                      // Marcadores dos totems
                      MarkerLayer(
                        markers: _totems.map((totem) {
                          return Marker(
                            point: LatLng(
                              (totem['lat'] as num).toDouble(),
                              (totem['lng'] as num).toDouble(),
                            ),
                            width: 40,
                            height: 40,
                            child: GestureDetector(
                              onTap: () => _showTotemInfo(totem),
                              child: const Icon(
                                Icons.pin_drop,
                                color: Color(0xFF6A0DAD),
                                size: 34,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
                // Lista de totems ordenados por distância
                Expanded(
                  flex: 2,
                  child: _totems.isEmpty
                      ? const Center(
                          child: Text(
                            'Nenhum totem cadastrado',
                            style: TextStyle(color: Colors.grey),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          itemCount: _sortedTotems.length,
                          itemBuilder: (context, index) {
                            final totem = _sortedTotems[index];
                            final dist = _calcDistance(
                              (totem['lat'] as num).toDouble(),
                              (totem['lng'] as num).toDouble(),
                            );
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: const CircleAvatar(
                                  backgroundColor: Color(0xFFF3E5F5),
                                  child: Icon(Icons.pin_drop, color: Color(0xFF6A0DAD)),
                                ),
                                title: Text(
                                  totem['name'] ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                subtitle: Text(
                                  totem['address'] ?? '',
                                  style: const TextStyle(fontSize: 12),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    if (dist.isNotEmpty)
                                      Text(
                                        dist,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: Color(0xFF6A0DAD),
                                        ),
                                      ),
                                    const Icon(Icons.directions, size: 20, color: Color(0xFF6A0DAD)),
                                  ],
                                ),
                                onTap: () => _openInMaps(
                                  (totem['lat'] as num).toDouble(),
                                  (totem['lng'] as num).toDouble(),
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }

  List<dynamic> get _sortedTotems {
    if (_userLocation == null) return _totems;

    final sorted = List<dynamic>.from(_totems);
    const distance = Distance();

    sorted.sort((a, b) {
      final distA = distance.as(
        LengthUnit.Meter,
        _userLocation!,
        LatLng((a['lat'] as num).toDouble(), (a['lng'] as num).toDouble()),
      );
      final distB = distance.as(
        LengthUnit.Meter,
        _userLocation!,
        LatLng((b['lat'] as num).toDouble(), (b['lng'] as num).toDouble()),
      );
      return distA.compareTo(distB);
    });

    return sorted;
  }

  void _showTotemInfo(dynamic totem) {
    final dist = _calcDistance(
      (totem['lat'] as num).toDouble(),
      (totem['lng'] as num).toDouble(),
    );

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.pin_drop, color: Color(0xFF6A0DAD), size: 28),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    totem['name'] ?? '',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                if (dist.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3E5F5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      dist,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF6A0DAD),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (totem['address'] != null)
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      totem['address'],
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ),
                ],
              ),
            if (totem['description'] != null && totem['description'].isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(totem['description'], style: const TextStyle(fontSize: 14)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _openInMaps(
                    (totem['lat'] as num).toDouble(),
                    (totem['lng'] as num).toDouble(),
                  );
                },
                icon: const Icon(Icons.directions),
                label: const Text('Abrir no Google Maps'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6A0DAD),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
