# Reference: Module Federation expose pipeline

## Minimal expose wrapper

```tsx
import { MemoryRouter } from 'react-router-dom'
import MyComponent from '../../layout/MyComponent'
import '../../customstyles.scss'
import '../../index.scss'

const Component = (props: any) => (
  <MemoryRouter>
    <MyComponent {...props} />
  </MemoryRouter>
)
export default Component
```

## Minimal shared RemoteApp wrapper

```tsx
import RemoteApp from '<scope>/shared/components/remote/RemoteApp'
import {
  PRODUCER_MF_NAME,
  PRODUCER_MF_MY_COMPONENT,
} from '<scope>/shared/types/remoteAppProps'

const MyComponent = (props: any) => (
  <RemoteApp appInfo={[PRODUCER_MF_NAME, PRODUCER_MF_MY_COMPONENT]} {...props} />
)
export default MyComponent
```

## Related knowledge
- `mf-expose-requires-memoryrouter-wrapper`
- `mf-cross-remote-import-forbidden`
- `mf-select-unstable-options-infinite-loop`
