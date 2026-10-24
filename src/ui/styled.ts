import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Canvas } from 'react-native-skia';
import { withUniwind } from 'uniwind';

export const StyledRootView = withUniwind(GestureHandlerRootView);
export const StyledCanvas = withUniwind(Canvas);
