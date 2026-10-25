// react-three-fiber helpers for hand control. Use them INSIDE a <Canvas>.
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { hand, emitHand } from './handStore';

const ndc = { x: 0, y: 0 };

function findHandTarget(object) {
    for (let o = object; o; o = o.parent) {
        if (o.userData?.handTarget) return o.userData.handTarget;
    }
    return null;
}

/**
 * Makes 3D objects hand-selectable. Mark an object (or any parent group) with
 *   userData={{ handTarget: { id: 'nucleus', label: 'Ядро', onSelect: () => ... } }}
 * The cursor then shows the label on hover and dwell/grab "clicks" call onSelect.
 * Listen for hover changes with onHand('hover3d', target => ...) to highlight objects.
 */
export function HandPointer() {
    const { camera, scene, raycaster } = useThree();
    const frame = useRef(0);

    useFrame(() => {
        if (!hand.present) {
            if (hand.hover3d) {
                hand.hover3d = null;
                emitHand('hover3d', null);
            }
            return;
        }
        if (frame.current++ % 2) return; // raycasting every other frame is plenty

        ndc.x = hand.nx;
        ndc.y = hand.ny;
        raycaster.setFromCamera(ndc, camera);
        let target = null;
        for (const hit of raycaster.intersectObjects(scene.children, true)) {
            if (!hit.object.visible) continue;
            target = findHandTarget(hit.object);
            if (target) break;
        }
        if ((target?.id ?? null) !== (hand.hover3d?.id ?? null)) {
            hand.hover3d = target;
            emitHand('hover3d', target);
        }
    });

    return null;
}
