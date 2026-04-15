# Jenkins dual-registry docker push

## Goal
Build once, publish to **two** registries (e.g. on-prem at `internal:5000`, SaaS at `external:5000`), each tagged with:
- a **current** tag: `release-X.Y.Z-<BUILD_NUMBER>` (immutable per build)
- a **latest** tag: `release-X.Y.Z` (rolls forward)

## Shape (Declarative pipeline skeleton)

```groovy
def REG_SAAS   = "external.example.com:5000"
def REG_ONPREM = "internal.example.com:5000"
def IMAGE      = "service-name"

stage('Resolve tags') {
  def base = gitlabSourceBranch.replace("refs/tags/", "")
                               .replace("origin/", "")
                               .replace("release-", "")
  CURRENT  = "${base}-${env.BUILD_NUMBER}"
  LATEST   = "${base}"
}

stage('Build & tag') {
  sh "docker build " +
     "-t ${REG_SAAS}/${IMAGE}:${CURRENT} " +
     "-t ${REG_SAAS}/${IMAGE}:${LATEST} " +
     "-t ${REG_ONPREM}/${IMAGE}:${CURRENT} " +
     "-t ${REG_ONPREM}/${IMAGE}:${LATEST} ."
}

stage('Push') {
  [REG_SAAS, REG_ONPREM].each { reg ->
    withCredentials([usernamePassword(credentialsId: 'registry-creds',
        usernameVariable: 'U', passwordVariable: 'P')]) {
      sh """
        docker login http://${reg} -u $U -p $P
        docker push ${reg}/${IMAGE}:${CURRENT}
        docker push ${reg}/${IMAGE}:${LATEST}
        docker logout http://${reg}
      """
    }
  }
}

post { always { sh "docker rmi ${REG_SAAS}/${IMAGE}:${CURRENT} ${REG_SAAS}/${IMAGE}:${LATEST} ${REG_ONPREM}/${IMAGE}:${CURRENT} ${REG_ONPREM}/${IMAGE}:${LATEST} || true" } }
```

## Gotchas
- Always `docker logout` per registry. Credential leakage across stages is real.
- Clean local image tags in `post { always }` — otherwise Jenkins agents fill up.
- Validate the source ref **before** computing tags. Accept only `release-*`, `develop`, or tags starting with `release-`; fail fast on PR branches.
- Tag the build-specific current tag **before** the latest tag so a mid-flight failure doesn’t overwrite `latest` with a broken image.

## Counter / Caveats
- For true provenance, push once and use registry mirroring (`regctl`/Harbor replication) rather than building twice or pushing twice.
- Don’t parameterize the source branch from untrusted input — inject it via GitLab webhook parameters only.
