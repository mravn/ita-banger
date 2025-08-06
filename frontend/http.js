export async function putResource(path) {
    const response = await fetch(path, {
        method: 'PUT',
    });
    if (!response.ok) {
        throw new Error(`PUT ${path} resulted in ${response.status} ${response.statusText}`);
    }
}

export async function getResource(path) {
    const response = await fetch(path, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`GET ${path} resulted in ${response.status} ${response.statusText}`);
    }
    return await response.json();
}

export async function postResource(path) {
    const response = await fetch(path, {
        method: 'POST',
    })
    if (!response.ok) {
        throw new Error(`POST ${path} resulted in ${response.status} ${response.statusText}`);
    }
}

export async function deleteResource(path) {
    const response = await fetch(path, {
        method: 'DELETE',
    })
    if (!response.ok) {
        throw new Error(`DELETE ${path} resulted in ${response.status} ${response.statusText}`);
    }
}

