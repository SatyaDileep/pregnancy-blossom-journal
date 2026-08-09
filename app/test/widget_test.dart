import 'package:blossom_journal/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('app boots and shows the journal cover', (tester) async {
    await tester.pumpWidget(const BlossomApp());
    await tester.pumpAndSettle();

    expect(find.text('Our Journey To You'), findsOneWidget);
    expect(find.text('Pick your colour'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Week-by-week guidance'), 200);
    expect(find.text('Week-by-week guidance'), findsOneWidget);
  });

  testWidgets('theme can be switched to ocean', (tester) async {
    await tester.pumpWidget(const BlossomApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('🌊 Ocean'));
    await tester.pumpAndSettle();

    expect(find.text('🌊 Ocean'), findsOneWidget);
  });
}
